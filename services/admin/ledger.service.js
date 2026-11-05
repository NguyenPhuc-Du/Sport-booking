const User = require("../../models/user.model");
const Venue = require("../../models/facilities.model");
const Ledger = require("../../models/ledger-entry.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const rate = require("./rate.service");
const { formatVnd, percentLabel } = require("./present");
const {
  ROLES,
  LEDGER_TYPES,
  LEDGER_CODES,
  CHARTS,
  byCode,
  startOfDay,
  startOfWeek,
  startOfMonth,
  addUnit,
} = require("./catalog");

const PAGE_SIZE = 12;

function nextCode() {
  return `LG${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
}

function typeLabel(code) {
  const found = byCode(LEDGER_TYPES, code);
  return found ? found.label : code;
}

async function appendLine(input) {
  const latest = await Ledger.findOne()
    .sort({ created_at: -1, _id: -1 })
    .select("balance_after")
    .lean();
  const balance =
    (latest ? latest.balance_after : 0) + Number(input.effect || 0);
  try {
    return await Ledger.create({
      code: input.code || nextCode(),
      type: input.type,
      user_id: input.user_id || null,
      owner_id: input.owner_id || null,
      booking_id: input.booking_id || null,
      booking_code: input.booking_code || "",
      amount: Number(input.amount) || 0,
      effect: Number(input.effect) || 0,
      balance_after: balance,
      rate: input.rate == null ? null : input.rate,
      collected: Boolean(input.collected),
      settled_booking_ids: input.settled_booking_ids || [],
      note: input.note || "",
      created_at: input.created_at || new Date(),
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Dòng sổ này đã có");
    }
    throw error;
  }
}

async function recordPaidBooking(booking) {
  if (!booking || !booking._id) return;
  const existed = await Ledger.findOne({
    booking_id: booking._id,
    type: "payment",
  })
    .select("_id")
    .lean();
  if (existed) return;

  const venue = booking.facilityId
    ? await Venue.findById(booking.facilityId).select("owner_id").lean()
    : null;
  const ownerId = venue ? venue.owner_id : null;
  const share = await rate.resolveRate(ownerId);
  const amount = Math.round(Number(booking.amount) || 0);
  const fee = Math.round(amount * share);
  const cash = booking.paymentMethod === "cash";
  const when = booking.paidAt ? new Date(booking.paidAt) : new Date();
  const rows = [
    {
      type: "payment",
      user_id: booking.userId || ownerId,
      owner_id: ownerId,
      booking_id: booking._id,
      booking_code: booking.code,
      amount,
      effect: cash ? 0 : amount,
      collected: !cash,
      note: cash ? "Thanh toán tiền mặt tại sân" : "Thanh toán qua nền tảng",
      created_at: when,
    },
    {
      type: "commission",
      user_id: ownerId,
      owner_id: ownerId,
      booking_id: booking._id,
      booking_code: booking.code,
      amount: fee,
      effect: 0,
      rate: share,
      collected: !cash,
      note: `Hoa hồng ${percentLabel(share)}`,
      created_at: new Date(when.getTime() + 1),
    },
  ];

  for (const row of rows) {
    if (row.type === "commission" && !ownerId) continue;
    try {
      await appendLine(row);
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
    }
  }
}

async function recordRefund(booking) {
  if (!booking || !booking._id) return;
  const payment = await Ledger.findOne({
    booking_id: booking._id,
    type: "payment",
  }).lean();
  if (!payment) return;

  const refunded = await Ledger.findOne({
    booking_id: booking._id,
    type: "refund",
  })
    .select("_id")
    .lean();
  if (!refunded) {
    await appendLine({
      type: "refund",
      user_id: payment.user_id,
      owner_id: payment.owner_id,
      booking_id: booking._id,
      booking_code: booking.code || payment.booking_code,
      amount: payment.amount,
      effect: -Number(payment.effect || 0),
      note: "Hoàn tiền do hủy đơn",
    });
  }

  const commission = await Ledger.findOne({
    booking_id: booking._id,
    type: "commission",
  }).lean();
  const reversed = await Ledger.findOne({
    booking_id: booking._id,
    type: "adjustment",
    amount: { $lt: 0 },
  })
    .select("_id")
    .lean();
  if (commission && !reversed) {
    await appendLine({
      type: "adjustment",
      user_id: commission.user_id,
      owner_id: commission.owner_id,
      booking_id: booking._id,
      booking_code: booking.code || commission.booking_code,
      amount: -Number(commission.amount || 0),
      effect: 0,
      note: "Hoàn hoa hồng do hủy đơn",
    });
  }
}

function marksOf(lines) {
  const voided = new Set();
  const settled = new Set();
  lines.forEach((row) => {
    if (row.type === "adjustment" && row.booking_id && Number(row.amount) < 0) {
      voided.add(String(row.booking_id));
    }
    (row.settled_booking_ids || []).forEach((id) => settled.add(String(id)));
  });
  return { voided, settled };
}

function isVoid(row, marks) {
  return marks.voided.has(String(row.booking_id || ""));
}

function isSettled(row, marks) {
  return marks.settled.has(String(row.booking_id || ""));
}

function commissionState(row, marks) {
  if (isVoid(row, marks)) return "void";
  if (row.collected || isSettled(row, marks)) return "collected";
  return "open";
}

function readQuery(query) {
  const source = query || {};
  const page = Math.max(parseInt(source.page, 10) || 1, 1);
  const type = LEDGER_CODES.includes(source.type) ? source.type : "";
  const q = String(source.q || "").trim();
  const userId = source.userId || "";
  const from = source.from ? new Date(source.from) : null;
  const to = source.to ? new Date(source.to) : null;
  if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);

  const filter = {};
  if (type) filter.type = type;
  if (q) filter.code = q;
  if (userId) filter.user_id = userId;
  if (from || to) {
    filter.created_at = {};
    if (from && !Number.isNaN(from.getTime())) filter.created_at.$gte = from;
    if (to && !Number.isNaN(to.getTime())) filter.created_at.$lte = to;
  }

  return {
    filter,
    page,
    type,
    q,
    userId,
    from: source.from || "",
    to: source.to || "",
  };
}

function presentRow(row) {
  const account =
    row.user_id && row.user_id.fullName ? row.user_id.fullName : "—";
  return {
    code: row.code,
    when: row.created_at
      ? new Date(row.created_at).toLocaleString("vi-VN")
      : "—",
    account,
    type: row.type,
    typeLabel: typeLabel(row.type),
    amount: row.amount,
    amountLabel: formatVnd(row.amount),
    balanceLabel: formatVnd(row.balance_after),
    note: row.note || row.booking_code || "",
  };
}

async function list(query) {
  const read = readQuery(query);
  const [total, rows, accounts] = await Promise.all([
    Ledger.countDocuments(read.filter),
    Ledger.find(read.filter)
      .populate("user_id", "fullName")
      .sort({ created_at: -1 })
      .skip((read.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    User.find().select("fullName role").sort({ fullName: 1 }).lean(),
  ]);

  return {
    items: rows.map(presentRow),
    total,
    page: read.page,
    pages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
    type: read.type,
    q: read.q,
    userId: read.userId,
    from: read.from,
    to: read.to,
    accounts,
    types: LEDGER_TYPES,
  };
}

async function csv(query) {
  const read = readQuery(query);
  const rows = await Ledger.find(read.filter)
    .populate("user_id", "fullName")
    .sort({ created_at: -1 })
    .lean();
  const header = [
    "Thời gian",
    "Mã",
    "Tài khoản",
    "Loại",
    "Số tiền",
    "Số dư sau",
    "Ghi chú",
  ];
  const body = rows.map((row) => {
    const item = presentRow(row);
    return [
      item.when,
      item.code,
      item.account,
      item.typeLabel,
      item.amount,
      row.balance_after,
      item.note,
    ];
  });
  const lines = [header, ...body].map((cols) =>
    cols
      .map((value) => {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(","),
  );
  return `\uFEFF${lines.join("\n")}`;
}

async function adjust(actorId, body) {
  const amount = Number(body.amount);
  const note = String(body.note || "").trim();
  if (!Number.isFinite(amount) || amount === 0) {
    throw new ServiceError("Số tiền điều chỉnh phải khác 0");
  }
  if (!note) throw new ServiceError("Nhập lý do điều chỉnh");
  const user = await User.findById(body.userId).lean();
  if (!user) throw new ServiceError("Không có tài khoản này");

  await appendLine({
    type: "adjustment",
    user_id: user._id,
    owner_id: user.role === "OWNER" ? user._id : null,
    amount,
    effect: amount,
    note,
  });
  await audit.write(actorId, "ledger.adjust", user._id, `${amount} · ${note}`);
}

async function ownerPosition(ownerId) {
  const lines = await Ledger.find({ owner_id: ownerId }).lean();
  const ids = lines.map((row) => row.booking_id).filter(Boolean);
  const extra = ids.length
    ? await Ledger.find({ settled_booking_ids: { $in: ids } })
        .select("settled_booking_ids type amount booking_id")
        .lean()
    : [];
  const marks = marksOf([...lines, ...extra]);
  const commissions = lines.filter((row) => row.type === "commission");
  const debt = commissions
    .filter((row) => commissionState(row, marks) === "open")
    .reduce((sum, row) => sum + row.amount, 0);
  const heldIn = lines
    .filter((row) => row.type === "payment")
    .reduce((sum, row) => sum + Number(row.effect || 0), 0);
  const kept = commissions
    .filter((row) => row.collected && !isVoid(row, marks))
    .reduce((sum, row) => sum + row.amount, 0);
  const paidOut = lines
    .filter((row) => row.type === "withdrawal")
    .reduce((sum, row) => sum + row.amount, 0);
  const held = heldIn - kept - paidOut;
  return {
    debt,
    debtLabel: formatVnd(debt),
    held,
    heldLabel: formatVnd(held),
  };
}

function countOf(list, field) {
  return list && list[0] && list[0][field] ? list[0][field] : 0;
}

function chartBuckets(range) {
  const spec = byCode(CHARTS, range) || CHARTS[0];
  const today = startOfDay(new Date());
  const buckets = [];
  for (let index = spec.buckets - 1; index >= 0; index -= 1) {
    const start = addUnit(today, spec.unit, -index);
    buckets.push({
      label:
        spec.unit === "month"
          ? `${start.getMonth() + 1}/${start.getFullYear()}`
          : `${start.getDate()}/${start.getMonth() + 1}`,
      start,
      end: addUnit(start, spec.unit, 1),
      amount: 0,
    });
  }
  return { spec, buckets };
}

function paintBuckets(buckets, rows) {
  rows.forEach((row) => {
    const at = new Date(row.created_at).getTime();
    const bucket = buckets.find(
      (item) => at >= item.start.getTime() && at < item.end.getTime(),
    );
    if (bucket) bucket.amount += row.amount;
  });
  const max = buckets.reduce((peak, item) => Math.max(peak, item.amount), 0);
  const total = buckets.reduce((sum, item) => sum + item.amount, 0);
  return {
    totalLabel: formatVnd(total),
    buckets: buckets.map((item) => ({
      label: item.label,
      amount: item.amount,
      amountLabel: formatVnd(item.amount),
      height: max ? Math.max(8, Math.round((item.amount / max) * 100)) : 8,
    })),
  };
}

async function dashboard(range) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const { spec, buckets } = chartBuckets(range);
  const chartFrom = buckets[0].start;
  const chartTo = buckets[buckets.length - 1].end;

  const [userFacet, ledgerFacet] = await Promise.all([
    User.aggregate([
      {
        $facet: {
          byRole: [{ $group: { _id: "$role", count: { $sum: 1 } } }],
          active: [{ $match: { status: "active" } }, { $count: "n" }],
          weekNew: [
            { $match: { createdAt: { $gte: weekStart } } },
            { $count: "n" },
          ],
          monthNew: [
            { $match: { createdAt: { $gte: monthStart } } },
            { $count: "n" },
          ],
        },
      },
    ]),
    Ledger.aggregate([
      {
        $facet: {
          entries: [{ $count: "n" }],
          gmv: [
            { $match: { type: "payment" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          monthFee: [
            {
              $match: {
                type: "commission",
                created_at: { $gte: monthStart },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          collected: [
            { $match: { type: "commission", collected: true } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          chart: [
            {
              $match: {
                type: "commission",
                created_at: { $gte: chartFrom, $lt: chartTo },
              },
            },
            { $project: { amount: 1, created_at: 1 } },
          ],
          recent: [
            { $sort: { created_at: -1 } },
            { $limit: 8 },
            {
              $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                pipeline: [{ $project: { fullName: 1 } }],
                as: "user",
              },
            },
          ],
        },
      },
    ]),
  ]);

  const users = userFacet[0];
  const books = ledgerFacet[0];
  const roleMap = new Map(users.byRole.map((row) => [row._id, row.count]));
  const totalUsers = users.byRole.reduce((sum, row) => sum + row.count, 0);
  const painted = paintBuckets(buckets, books.chart);

  return {
    cards: [
      {
        href: "/admin/users",
        icon: "bi-people",
        label: "Tổng tài khoản",
        value: String(totalUsers),
        note: ROLES.map(
          (item) => `${item.label} ${roleMap.get(item.code) || 0}`,
        ).join(" · "),
      },
      {
        href: "/admin/users?status=active",
        icon: "bi-person-check",
        label: "Tài khoản hoạt động",
        value: String(countOf(users.active, "n")),
        note: `Mới tuần này ${countOf(users.weekNew, "n")} · tháng này ${countOf(users.monthNew, "n")}`,
      },
      {
        href: "/admin/ledger",
        icon: "bi-journal-text",
        label: "Tổng giao dịch",
        value: String(countOf(books.entries, "n")),
        note: `GMV ${formatVnd(countOf(books.gmv, "total"))}`,
      },
      {
        href: "/admin/commissions",
        icon: "bi-percent",
        label: "Hoa hồng tháng này",
        value: formatVnd(countOf(books.monthFee, "total")),
        note: `Đã thu ${formatVnd(countOf(books.collected, "total"))}`,
      },
    ],
    charts: CHARTS,
    chart: { code: spec.code, ...painted },
    recent: books.recent.map((row) =>
      presentRow({ ...row, user_id: row.user[0] || null }),
    ),
  };
}

async function linesForOwner(ownerId, from, to) {
  return Ledger.find({
    owner_id: ownerId,
    created_at: { $gte: from, $lte: to },
    type: { $in: ["payment", "commission"] },
  }).lean();
}

module.exports = {
  appendLine,
  recordPaidBooking,
  recordRefund,
  marksOf,
  isVoid,
  isSettled,
  commissionState,
  list,
  csv,
  adjust,
  ownerPosition,
  dashboard,
  linesForOwner,
};
