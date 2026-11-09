const User = require("../../models/user.model");
const Ledger = require("../../models/ledger-entry.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const ledger = require("./ledger.service");
const rate = require("./rate.service");
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
  const extra = await Ledger.find({
    $or: [
      { settled_booking_ids: { $in: ids } },
      { type: "adjustment", booking_id: { $in: ids }, amount: { $lt: 0 } },
    ],
  })
    .select("type booking_id amount settled_booking_ids")
    .lean();
  return ledger.marksOf(extra);
}

function sumBy(rows, pick) {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

function rateLabelOf(rows) {
  const rates = [
    ...new Set(rows.map((row) => row.rate).filter((item) => item != null)),
  ];
  if (rates.length === 1) return percentLabel(rates[0]);
  return rates.length ? "Nhiều mức" : "—";
}

function openParts(lines, marks) {
  const openCash = lines.filter(
    (row) =>
      row.type === "commission" &&
      !row.collected &&
      ledger.commissionState(row, marks) === "open",
  );
  const openPlatform = lines.filter(
    (row) =>
      row.type === "commission" &&
      row.collected &&
      !ledger.isVoid(row, marks) &&
      !ledger.isSettled(row, marks),
  );
  const platformIds = new Set(openPlatform.map((row) => String(row.booking_id)));
  const held = lines
    .filter(
      (row) =>
        row.type === "payment" && platformIds.has(String(row.booking_id)),
    )
    .reduce((sum, row) => sum + Number(row.effect || 0), 0);
  const fee = openPlatform.reduce((sum, row) => sum + row.amount, 0);
  const debt = openCash.reduce((sum, row) => sum + row.amount, 0);
  return {
    openCash,
    openPlatform,
    debt,
    payout: held - fee,
  };
}

function reportRow(owner, lines, marks) {
  const payments = lines.filter(
    (row) => row.type === "payment" && !ledger.isVoid(row, marks),
  );
  const alive = lines.filter(
    (row) =>
      row.type === "commission" &&
      ledger.commissionState(row, marks) !== "void",
  );
  if (!payments.length && !alive.length) return null;
  const collected = alive.filter(
    (row) => ledger.commissionState(row, marks) === "collected",
  );
  const open = alive.filter(
    (row) => ledger.commissionState(row, marks) === "open",
  );
  const parts = openParts(lines, marks);
  const revenue = sumBy(payments, (row) => row.amount);
  const fee = sumBy(alive, (row) => row.amount);
  return {
    ownerId: owner._id,
    ownerName: owner.fullName,
    revenue,
    revenueLabel: formatVnd(revenue),
    rateLabel: rateLabelOf(alive),
    fee,
    feeLabel: formatVnd(fee),
    collectedLabel: formatVnd(sumBy(collected, (row) => row.amount)),
    openLabel: formatVnd(sumBy(open, (row) => row.amount)),
    closed: parts.debt <= 0 && parts.payout <= 0,
  };
}

async function report(period) {
  const [owners, lines] = await Promise.all([
    User.find({ role: "OWNER" })
      .select("fullName")
      .sort({ fullName: 1 })
      .lean(),
    Ledger.find({
      $or: [
        {
          created_at: { $gte: period.from, $lte: period.to },
          type: { $in: ["payment", "commission"] },
        },
        { "settled_booking_ids.0": { $exists: true } },
        { type: "adjustment", amount: { $lt: 0 }, booking_id: { $ne: null } },
      ],
    })
      .select(
        "type owner_id booking_id amount effect rate collected created_at settled_booking_ids",
      )
      .lean(),
  ]);

  const from = period.from.getTime();
  const to = period.to.getTime();
  const periodLines = lines.filter((row) => {
    if (row.type !== "payment" && row.type !== "commission") return false;
    const at = row.created_at ? new Date(row.created_at).getTime() : 0;
    return at >= from && at <= to;
  });
  const marks = ledger.marksOf(lines);
  const byOwner = new Map();
  periodLines.forEach((row) => {
    const key = String(row.owner_id || "");
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(row);
  });

  return owners.flatMap((owner) => {
    const row = reportRow(owner, byOwner.get(String(owner._id)) || [], marks);
    return row ? [row] : [];
  });
}

async function page(query) {
  const period = periodOf(query, "weekly");
  return {
    period,
    cycles: CYCLES,
    rateLabel: percentLabel(rate.resolveRate()),
    rows: await report(period),
  };
}

async function closePeriod(actorId, body) {
  const owner = await User.findOne({ _id: body.ownerId, role: "OWNER" }).lean();
  if (!owner) throw new ServiceError("Chọn chủ sân");
  const period = periodOf(body, "weekly");
  const lines = await ledger.linesForOwner(owner._id, period.from, period.to);
  const marks = await marksFor(lines);
  const parts = openParts(lines, marks);

  if (parts.debt <= 0 && parts.payout <= 0) {
    throw new ServiceError("Kỳ này đã chốt");
  }

  if (parts.debt > 0) {
    await ledger.appendLine({
      type: "adjustment",
      user_id: owner._id,
      owner_id: owner._id,
      amount: parts.debt,
      effect: parts.debt,
      settled_booking_ids: parts.openCash.map((row) => row.booking_id),
      note: `Chốt hoa hồng tiền mặt ${period.fromInput} → ${period.toInput}`,
    });
  }
  if (parts.payout > 0) {
    await ledger.appendLine({
      type: "withdrawal",
      user_id: owner._id,
      owner_id: owner._id,
      amount: parts.payout,
      effect: -parts.payout,
      settled_booking_ids: parts.openPlatform.map((row) => row.booking_id),
      note: `Trả chủ sân phần đã thu qua sàn ${period.fromInput} → ${period.toInput}`,
    });
  }

  await audit.write(
    actorId,
    "commission.close",
    owner._id,
    `${owner.fullName} · nộp ${parts.debt} · trả ${parts.payout} · ${period.fromInput} → ${period.toInput}`,
  );
}

module.exports = { page, closePeriod };
