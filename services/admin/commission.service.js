const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const rate = require("./rate.service");
const ledger = require("./ledger.service");
const { formatVnd, percentLabel } = require("./present");
const { CYCLES, byCode, isoDate } = require("./catalog");

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function periodOf(query, cycle) {
  const chosen =
    byCode(CYCLES, query.cycle) || byCode(CYCLES, cycle) || CYCLES[0];
  if (query.from && query.to) {
    return {
      from: new Date(query.from),
      to: endOfDay(query.to),
      fromInput: query.from,
      toInput: query.to,
      cycle: chosen.code,
    };
  }
  const to = new Date();
  const from = new Date();
  if (chosen.code === "monthly") from.setMonth(from.getMonth() - 1);
  else from.setDate(from.getDate() - chosen.days);
  return {
    from,
    to,
    fromInput: isoDate(from),
    toInput: isoDate(to),
    cycle: chosen.code,
  };
}

async function marksFor(lines) {
  const ids = lines.map((row) => row.booking_id).filter(Boolean);
  if (!ids.length) return ledger.marksOf([]);
  const Ledger = require("../../models/ledger-entry.model");
  const [covers, reversals] = await Promise.all([
    Ledger.find({ settled_booking_ids: { $in: ids } })
      .select("settled_booking_ids")
      .lean(),
    Ledger.find({
      type: "adjustment",
      booking_id: { $in: ids },
      amount: { $lt: 0 },
    })
      .select("type booking_id amount")
      .lean(),
  ]);
  return ledger.marksOf([...covers, ...reversals]);
}

function sumBy(rows, pick) {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

async function report(period) {
  const owners = await User.find({ role: "OWNER" })
    .select("fullName email")
    .sort({ fullName: 1 })
    .lean();

  const rows = [];
  for (const owner of owners) {
    const lines = await ledger.linesForOwner(owner._id, period.from, period.to);
    const marks = await marksFor(lines);
    const payments = lines.filter(
      (row) => row.type === "payment" && !ledger.isVoid(row, marks),
    );
    const commissions = lines.filter((row) => row.type === "commission");
    const alive = commissions.filter(
      (row) => ledger.commissionState(row, marks) !== "void",
    );
    const collected = alive.filter(
      (row) => ledger.commissionState(row, marks) === "collected",
    );
    const open = alive.filter(
      (row) => ledger.commissionState(row, marks) === "open",
    );
    if (!payments.length && !alive.length) continue;

    const rates = [
      ...new Set(alive.map((row) => row.rate).filter((item) => item != null)),
    ];
    const revenue = sumBy(payments, (row) => row.amount);
    const fee = sumBy(alive, (row) => row.amount);
    const collectedAmount = sumBy(collected, (row) => row.amount);
    const openAmount = sumBy(open, (row) => row.amount);
    rows.push({
      ownerId: owner._id,
      ownerName: owner.fullName,
      revenue,
      revenueLabel: formatVnd(revenue),
      rateLabel:
        rates.length === 1
          ? percentLabel(rates[0])
          : rates.length
            ? "Nhiều mức"
            : "—",
      fee,
      feeLabel: formatVnd(fee),
      collectedLabel: formatVnd(collectedAmount),
      openLabel: formatVnd(openAmount),
    });
  }
  return rows;
}

async function page(query) {
  const tab = query.tab === "config" ? "config" : "report";
  const setting = await rate.readSetting();
  const period = periodOf(query, setting.payoutCycle);
  const [rows, owners, overrides] = await Promise.all([
    report(period),
    User.find({ role: "OWNER", status: "active" })
      .select("fullName email")
      .sort({ fullName: 1 })
      .lean(),
    rate.listOverrides(),
  ]);
  return {
    tab,
    setting: {
      ...setting,
      ratePercent: Math.round(setting.commissionRate * 1000) / 10,
      rateLabel: percentLabel(setting.commissionRate),
    },
    period,
    rows,
    owners,
    overrides: overrides.map((row) => ({
      ownerName: row.user_id ? row.user_id.fullName : "Tài khoản không còn",
      rateLabel: percentLabel(row.commissionRate),
    })),
    cycles: CYCLES,
  };
}

function assertMin(amount, minPayout, label) {
  if (amount > 0 && amount < minPayout) {
    throw new ServiceError(`${label} chưa đạt hạn mức chuyển`);
  }
}

async function closePeriod(actorId, body) {
  const owner = await User.findOne({ _id: body.ownerId, role: "OWNER" }).lean();
  if (!owner) throw new ServiceError("Chọn chủ sân");
  const period = periodOf(body, "weekly");
  const setting = await rate.readSetting();
  const lines = await ledger.linesForOwner(owner._id, period.from, period.to);
  const marks = await marksFor(lines);

  const openCash = lines.filter(
    (row) =>
      row.type === "commission" &&
      !row.collected &&
      ledger.commissionState(row, marks) === "open",
  );
  const openVnpay = lines.filter(
    (row) =>
      row.type === "commission" &&
      row.collected &&
      !ledger.isVoid(row, marks) &&
      !ledger.isSettled(row, marks),
  );
  const vnpayIds = new Set(openVnpay.map((row) => String(row.booking_id)));
  const gmv = lines
    .filter(
      (row) => row.type === "payment" && vnpayIds.has(String(row.booking_id)),
    )
    .reduce((sum, row) => sum + Number(row.effect || 0), 0);
  const fee = openVnpay.reduce((sum, row) => sum + row.amount, 0);
  const debt = openCash.reduce((sum, row) => sum + row.amount, 0);
  const payout = gmv - fee;

  if (debt <= 0 && payout <= 0) {
    throw new ServiceError("Kỳ này không còn khoản chưa chốt");
  }
  assertMin(debt, setting.minPayout, "Hoa hồng tiền mặt");
  assertMin(payout, setting.minPayout, "Tiền giữ hộ chủ sân");

  if (debt > 0) {
    await ledger.appendLine({
      type: "adjustment",
      user_id: owner._id,
      owner_id: owner._id,
      amount: debt,
      effect: debt,
      settled_booking_ids: openCash.map((row) => row.booking_id),
      note: `Chốt hoa hồng tiền mặt ${period.fromInput} → ${period.toInput}`,
    });
  }
  if (payout > 0) {
    await ledger.appendLine({
      type: "withdrawal",
      user_id: owner._id,
      owner_id: owner._id,
      amount: payout,
      effect: -payout,
      settled_booking_ids: openVnpay.map((row) => row.booking_id),
      note: `Trả chủ sân phần đã thu qua sàn ${period.fromInput} → ${period.toInput}`,
    });
  }

  await audit.write(
    actorId,
    "commission.close",
    owner._id,
    `${owner.fullName} · nộp ${debt} · trả ${payout} · ${period.fromInput} → ${period.toInput}`,
  );
}

module.exports = { page, closePeriod };
