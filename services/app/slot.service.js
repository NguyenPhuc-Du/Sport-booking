const PriceRule = require("../../models/price-rule.model");
const Booking = require("../../models/booking.model");
const Voucher = require("../../models/finance.model");
const refreshmentService = require("./refreshment.service");

const TIME_ZONE = "Asia/Ho_Chi_Minh";

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
    await refreshmentService.releaseDrinks(item._id);
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

  const rules = await PriceRule.find({
    court: courtId,
    status: "active",
    dayType: { $in: [dayTypeOf(date), "all"] },
  }).lean();
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

async function quotePrice(slot, voucherCode, venueId) {
  const courtPrice = slot.price;
  const code = (voucherCode || "").trim().toUpperCase();

  if (!code) {
    return { courtPrice, discount: 0, amount: courtPrice, voucherCode: null };
  }

  const now = new Date();
  const voucher = await Voucher.findOne({
    code,
    deleted: false,
    status: "active",
    start_date: { $lte: now },
    end_date: { $gte: now },
    ...(venueId ? { venue_id: venueId } : {}),
  });

  if (!voucher) {
    const err = new Error("Mã giảm giá không hợp lệ hoặc đã hết hạn");
    err.status = 400;
    throw err;
  }
  if (voucher.quantity <= voucher.used_count) {
    const err = new Error("Mã giảm giá đã hết lượt sử dụng");
    err.status = 400;
    throw err;
  }
  if (courtPrice < (voucher.min_order_amount || 0)) {
    const err = new Error("Đơn chưa đủ điều kiện áp dụng mã");
    err.status = 400;
    throw err;
  }

  let discount = 0;
  if (voucher.discount_type === "fixed") {
    discount = voucher.discount_value;
  } else {
    discount = Math.round((courtPrice * voucher.discount_value) / 100);
    if (voucher.max_discount != null) {
      discount = Math.min(discount, voucher.max_discount);
    }
  }
  discount = Math.min(discount, courtPrice);

  return {
    courtPrice,
    discount,
    amount: courtPrice - discount,
    voucherCode: voucher.code,
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
