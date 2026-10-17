const PriceRule = require("../models/price-rule.model");
const Booking = require("../models/booking.model");
const Voucher = require("../models/finance.model");

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

function fromMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dayTypeOf(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay();

    return day === 0 || day === 6 ? "weekend" : "weekday";
}

async function expireStablePending() {
    const now = new Date();
    await Booking.updateMany(
        { status: "pending_payment", expiresAt: { $lte: now } },
        { $set: { status: "cancelled", statusLabel: "HẾT HẠN THANH TOÁN" } }
    );
}

async function isSlotTaken(courtId, date, timeStart) {
    await expireStablePending();
    const count = await Booking.countDocuments({
        courtId,
        date,
        timeStart,
        status: { $in: ["pending_payment", "upcoming", "completed"] },
    });

    return count > 0;
}

async function buildSlots(venue, courtId, date) {
    const open = venue.open_time || "06:00";
    const close = venue.close_time || "22:00";
    let start = toMinutes(open);
    const end = toMinutes(close);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const slots = [];
  
    const dayType = dayTypeOf(date);
    const rules = await PriceRule.find({
      court: courtId,
      status: "active",
      dayType: { $in: [dayType, "all"] },
    }).lean();
  
    for (; start + 60 <= end; start += 60) {
      const time = fromMinutes(start);
      const t = start;
  
      const matched = rules.find(
        (r) => t >= toMinutes(r.timeStart) && t < toMinutes(r.timeEnd)
      );

      if (!matched) continue;
  
      const taken = await isSlotTaken(courtId, date, time);
      const past =
        date < today ||
        (date === today && start <= now.getHours() * 60 + now.getMinutes());
  
      slots.push({
        time,
        price: matched.pricePerHour,
        peak: false,
        available: !taken && !past,
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
    isSlotTaken,
    fromMinutes,
    expireStablePending,
  };