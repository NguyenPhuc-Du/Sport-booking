const Voucher = require("../../models/finance.model");
const { nowInVietnam } = require("../app/slot.service");

const ADVANCE_MONTHS = 1;

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function addCalendarMonths(isoDate, months) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const result = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), Math.min(day, lastDay)),
  );
  return result.toISOString().slice(0, 10);
}

function advanceDateMax(today) {
  return addCalendarMonths(today || nowInVietnam().date, ADVANCE_MONTHS);
}

async function listUsableVouchers(venueIds) {
  const ids = (venueIds || []).filter(Boolean);
  if (!ids.length) return [];
  const now = new Date();
  const rows = await Voucher.find({
    deleted: false,
    status: "active",
    venue_id: { $in: ids },
    start_date: { $lte: now },
    end_date: { $gte: now },
    $expr: { $lt: ["$used_count", "$quantity"] },
  })
    .select(
      "code name venue_id apply_scope day_type time_start time_end product_ids discount_type discount_value max_discount min_order_amount",
    )
    .sort({ code: 1 })
    .lean();

  return rows.map((voucher) => ({
    code: voucher.code,
    name: voucher.name,
    venueId: String(voucher.venue_id),
    applyScope: voucher.apply_scope || "court",
    dayType: voucher.day_type || "all",
    timeStart: voucher.time_start || "",
    timeEnd: voucher.time_end || "",
    productIds: (voucher.product_ids || []).map(String),
    discountType: voucher.discount_type,
    discountValue: Number(voucher.discount_value) || 0,
    maxDiscount: voucher.max_discount == null ? null : Number(voucher.max_discount),
    minOrderAmount: Number(voucher.min_order_amount) || 0,
  }));
}

async function assertVoucherScopes(codes, allowed, message) {
  const unique = [...new Set((codes || []).filter(Boolean))];
  if (!unique.length) return;
  const docs = await Voucher.find({ code: { $in: unique }, deleted: false })
    .select("code apply_scope")
    .lean();
  const scopes = new Map(docs.map((doc) => [doc.code, doc.apply_scope || "court"]));
  for (const code of unique) {
    const scope = scopes.get(code);
    if (scope && !allowed.includes(scope)) throw fail(message);
  }
}

async function releaseVoucherUses(codes) {
  const unique = [...new Set((codes || []).filter(Boolean))];
  if (!unique.length) return;
  await Voucher.updateMany(
    { code: { $in: unique }, used_count: { $gt: 0 } },
    { $inc: { used_count: -1 } },
  );
}

async function consumeVoucherUses(codes) {
  const unique = [...new Set((codes || []).filter(Boolean))];
  const consumed = [];
  try {
    for (const code of unique) {
      const updated = await Voucher.findOneAndUpdate(
        {
          code,
          deleted: false,
          status: "active",
          $expr: { $lt: ["$used_count", "$quantity"] },
        },
        { $inc: { used_count: 1 } },
      );
      if (!updated) throw fail(`Mã ${code} đã hết lượt sử dụng`);
      consumed.push(code);
    }
    return consumed;
  } catch (error) {
    await releaseVoucherUses(consumed);
    throw error;
  }
}

module.exports = {
  advanceDateMax,
  listUsableVouchers,
  assertVoucherScopes,
  consumeVoucherUses,
  releaseVoucherUses,
};
