const PriceRule = require("../../models/price-rule.model");
const Booking = require("../../models/booking.model");
const Voucher = require("../../models/finance.model");
const drinkService = require("./drink.service");
const cache = require("../../helpers/memory-cache");

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const PRICE_TTL = 60 * 1000;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function nowInVietnam() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function dayTypeOf(dateStr) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

async function expireStablePending() {
  const expired = await Booking.find({
    status: "pending_payment",
    expiresAt: { $lte: new Date() },
  }).select("_id");
  if (!expired.length) return;

  await Booking.updateMany(
    { _id: { $in: expired.map((item) => item._id) }, status: "pending_payment" },
    { $set: { status: "cancelled", statusLabel: "HẾT HẠN THANH TOÁN" } },
  );
  for (const item of expired) {
    await drinkService.releaseDrinks(item._id);
  }
}

async function completePastBookings(filter = {}) {
  const now = nowInVietnam();
  await Booking.updateMany(
    {
      ...filter,
      status: "upcoming",
      $or: [{ date: { $lt: now.date } }, { date: now.date, timeEnd: { $lte: now.time } }],
    },
    { $set: { status: "completed", statusLabel: "HOÀN THÀNH" } }
  );
}

async function takenStarts(courtId, date) {
  await expireStablePending();
  const bookings = await Booking.find({
    courtId,
    date,
    status: { $in: ["pending_payment", "upcoming", "completed"] },
  })
    .select("timeStart timeEnd")
    .lean();
  
    const taken = new Set();
    for (const booking of bookings) {
      let cursor = toMinutes(booking.timeStart);
      const end = toMinutes(booking.timeEnd);

      for (; cursor < end; cursor += 60) {
        taken.add(fromMinutes(cursor));
      }
    }
    
    return taken;
}

async function buildSlots(venue, courtId, date) {
  let start = toMinutes(venue.open_time || "06:00");
  const end = toMinutes(venue.close_time || "22:00");
  const now = nowInVietnam();
  const nowMinutes = toMinutes(now.time);

  const dayType = dayTypeOf(date);
  const rules = await cache.remember(`price:${courtId}:${dayType}`, PRICE_TTL, () => {
    return PriceRule.find({
      court: courtId,
      status: "active",
      dayType: { $in: [dayType, "all"] },
    }).lean();
  });
  const taken = await takenStarts(courtId, date);

  const slots = [];
  for (; start + 60 <= end; start += 60) {
    const matched = rules.find(
      (r) => start >= toMinutes(r.timeStart) && start < toMinutes(r.timeEnd)
    );
    if (!matched) continue;

    const time = fromMinutes(start);
    const past = date < now.date || (date === now.date && start <= nowMinutes);

    slots.push({
      time,
      price: matched.pricePerHour,
      peak: false,
      available: !taken.has(time) && !past,
    });
  }

  return slots;
}

async function findSlot(venue, courtId, date, time) {
  const slots = await buildSlots(venue, courtId, date);
  return slots.find((s) => s.time === time) || null;
}

function matchesDayType(voucher, dateStr) {
  const dayType = voucher.day_type || "all";
  if (dayType === "all") return true;
  return dayTypeOf(dateStr) === dayType;
}

function matchesTimeWindow(voucher, timeStart) {
  const start = voucher.time_start || "";
  const end = voucher.time_end || "";
  if (!start && !end) return true;
  if (!start || !end || !timeStart) return false;
  const t = toMinutes(timeStart);
  return t >= toMinutes(start) && t < toMinutes(end);
}

function drinkEligibleTotal(drinks, productIds) {
  // product_ids rỗng = áp dụng mọi đồ uống trong đơn
  const allowed = new Set((productIds || []).map(String).filter(Boolean));
  return (drinks || []).reduce((sum, line) => {
    if (allowed.size && !allowed.has(String(line.drinkId))) return sum;
    return sum + Number(line.price || 0) * Number(line.qty || 0);
  }, 0);
}

function computeDiscount(voucher, base) {
  let discount = 0;
  if (voucher.discount_type === "fixed") {
    discount = voucher.discount_value;
  } else {
    discount = Math.round((base * voucher.discount_value) / 100);
    if (voucher.max_discount != null) {
      discount = Math.min(discount, voucher.max_discount);
    }
  }
  return Math.min(Math.max(discount, 0), base);
}

function normalizeVoucherCodes(input) {
  const fromArr = Array.isArray(input?.voucherCodes) ? input.voucherCodes : [];
  const fromSingle = input?.voucherCode ? [input.voucherCode] : [];
  return [
    ...new Set(
      [...fromArr, ...fromSingle]
        .map((c) => String(c || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Hỗ trợ nhiều voucher cộng dồn, mỗi apply_scope (court/drink/order) tối đa 1 mã.
 * @param {object} input
 */
async function quotePrice(input) {
  // Backward compat: old call quotePrice({ price }, code, venueId)
  let courtPrice;
  let drinks = [];
  let drinkTotal = 0;
  let date = "";
  let timeStart = "";
  let venueId;
  let codes = [];

  if (input && typeof input === "object" && "courtPrice" in input) {
    courtPrice = Number(input.courtPrice) || 0;
    drinks = input.drinks || [];
    drinkTotal = Number(input.drinkTotal) || 0;
    date = input.date || "";
    timeStart = input.timeStart || "";
    venueId = input.venueId;
    codes = normalizeVoucherCodes(input);
  } else {
    courtPrice = Number((input && input.price) || 0);
    codes = normalizeVoucherCodes({ voucherCode: arguments[1] });
    venueId = arguments[2];
  }

  const orderTotal = courtPrice + drinkTotal;
  if (!codes.length) {
    return {
      courtPrice,
      drinkTotal,
      discount: 0,
      amount: orderTotal,
      voucherCode: null,
      voucherCodes: [],
      voucherDiscounts: [],
    };
  }

  const now = new Date();
  const vouchers = await Voucher.find({
    code: { $in: codes },
    deleted: false,
    status: "active",
    start_date: { $lte: now },
    end_date: { $gte: now },
    ...(venueId ? { venue_id: venueId } : {}),
  });

  const byCode = new Map(vouchers.map((v) => [v.code, v]));
  const missing = codes.filter((c) => !byCode.has(c));
  if (missing.length) {
    throw httpError(400, `Mã giảm giá không hợp lệ hoặc đã hết hạn: ${missing.join(", ")}`);
  }

  const byScope = new Map();
  for (const code of codes) {
    const voucher = byCode.get(code);
    if (voucher.quantity <= voucher.used_count) {
      throw httpError(400, `Mã ${code} đã hết lượt sử dụng`);
    }
    if (date && !matchesDayType(voucher, date)) {
      throw httpError(400, `Mã ${code} không áp dụng cho ngày này`);
    }
    if (date && !matchesTimeWindow(voucher, timeStart)) {
      throw httpError(400, `Mã ${code} không áp dụng cho khung giờ này`);
    }
    const scope = voucher.apply_scope || "court";
    if (byScope.has(scope)) {
      throw httpError(400, "Mỗi loại voucher chỉ được chọn 1 mã (sân / đồ uống / hoá đơn)");
    }
    byScope.set(scope, voucher);
  }

  let courtDiscount = 0;
  let drinkDiscount = 0;
  let orderDiscount = 0;
  const voucherDiscounts = [];

  const courtVoucher = byScope.get("court");
  if (courtVoucher) {
    if (courtPrice < (courtVoucher.min_order_amount || 0)) {
      throw httpError(400, `Đơn chưa đủ điều kiện áp dụng mã ${courtVoucher.code}`);
    }
    courtDiscount = computeDiscount(courtVoucher, courtPrice);
    voucherDiscounts.push({
      code: courtVoucher.code,
      applyScope: "court",
      discount: courtDiscount,
    });
  }

  const drinkVoucher = byScope.get("drink");
  if (drinkVoucher) {
    const base = drinkEligibleTotal(drinks, drinkVoucher.product_ids);
    if (base <= 0) {
      throw httpError(400, "Đơn không có đồ uống đủ điều kiện áp mã");
    }
    if (base < (drinkVoucher.min_order_amount || 0)) {
      throw httpError(400, `Đơn chưa đủ điều kiện áp dụng mã ${drinkVoucher.code}`);
    }
    drinkDiscount = computeDiscount(drinkVoucher, base);
    voucherDiscounts.push({
      code: drinkVoucher.code,
      applyScope: "drink",
      discount: drinkDiscount,
    });
  }

  const orderVoucher = byScope.get("order");
  if (orderVoucher) {
    if (orderTotal < (orderVoucher.min_order_amount || 0)) {
      throw httpError(400, `Đơn chưa đủ điều kiện áp dụng mã ${orderVoucher.code}`);
    }
    const remaining = Math.max(orderTotal - courtDiscount - drinkDiscount, 0);
    orderDiscount = computeDiscount(orderVoucher, remaining);
    voucherDiscounts.push({
      code: orderVoucher.code,
      applyScope: "order",
      discount: orderDiscount,
    });
  }

  const discount = courtDiscount + drinkDiscount + orderDiscount;
  const appliedCodes = voucherDiscounts.map((v) => v.code);

  return {
    courtPrice,
    drinkTotal,
    discount,
    amount: Math.max(orderTotal - discount, 0),
    voucherCode: appliedCodes.length ? appliedCodes.join(",") : null,
    voucherCodes: appliedCodes,
    voucherDiscounts,
  };
}

module.exports = {
  buildSlots,
  findSlot,
  quotePrice,
  fromMinutes,
  nowInVietnam,
  expireStablePending,
  completePastBookings,
};
