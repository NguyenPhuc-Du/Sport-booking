const mongoose = require("mongoose");
const Booking = require("../../models/booking.model");
const facilityService = require("../../services/facility.service");
const slotService = require("../../services/slot.service");
const vnpay = require("../../services/vnpay.service");

const HOLD_MS = 15 * 60 * 1000;

function fail(res, status, message) {
  return res.status(status).json({ message });
}

function publicBooking(doc) {
  const b = doc.toObject ? doc.toObject() : doc;
  return {
    code: b.code,
    status: b.status,
    statusLabel: b.statusLabel,
    facilityId: String(b.facilityId),
    facilityName: b.facilityName,
    courtId: String(b.courtId),
    courtName: b.courtName,
    date: b.date,
    time: b.time,
    courtPrice: b.courtPrice,
    discount: b.discount,
    amount: b.amount,
    voucherCode: b.voucherCode,
    paymentMethod: b.paymentMethod,
    bookedAt: b.bookedAt,
  };
}

function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function resolveSelection(body) {
  const pair = await facilityService.getVenueAndCourt(body.facilityId, body.courtId);
  if (!pair) {
    const err = new Error("Không tìm thấy cơ sở hoặc sân");
    err.status = 404;
    throw err;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) {
    const err = new Error("Ngày không hợp lệ");
    err.status = 400;
    throw err;
  }

  const slot = await slotService.findSlot(pair.venue, pair.court._id, body.date, body.time);
  if (!slot) {
    const err = new Error("Khung giờ không tồn tại hoặc chưa có bảng giá");
    err.status = 400;
    throw err;
  }
  if (!slot.available) {
    const err = new Error("Khung giờ đã được đặt hoặc đã qua");
    err.status = 409;
    throw err;
  }

  const quote = await slotService.quotePrice(slot, body.voucherCode, pair.venue._id);
  return { venue: pair.venue, court: pair.court, slot, quote };
}

module.exports.quote = async (req, res) => {
  try {
    const { venue, court, slot, quote } = await resolveSelection(req.body);
    const end = slotService.fromMinutes(toMin(slot.time) + 60);
    return res.json({
      facilityId: String(venue._id),
      facilityName: venue.name,
      courtId: String(court._id),
      courtName: court.name,
      date: req.body.date,
      time: `${slot.time} - ${end}`,
      ...quote,
    });
  } catch (error) {
    return fail(res, error.status || 500, error.message || "Không tính được giá");
  }
};

module.exports.create = async (req, res) => {
  try {
    if ((req.body.paymentMethod || "vnpay") !== "vnpay") {
      return fail(res, 400, "Chỉ hỗ trợ thanh toán VNPay");
    }

    const { venue, court, slot, quote } = await resolveSelection(req.body);
    const end = slotService.fromMinutes(toMin(slot.time) + 60);
    const code = `SPZ${Date.now()}`;

    await slotService.expireStablePending();

    let booking;
    try {
      booking = await Booking.create({
        userId: req.auth.userId,
        code,
        status: "pending_payment",
        statusLabel: "CHỜ THANH TOÁN",
        facilityId: venue._id,
        facilityName: venue.name,
        courtId: court._id,
        courtName: court.name,
        date: req.body.date,
        timeStart: slot.time,
        timeEnd: end,
        time: `${slot.time} - ${end}`,
        courtPrice: quote.courtPrice,
        discount: quote.discount,
        amount: quote.amount,
        voucherCode: quote.voucherCode,
        paymentMethod: "vnpay",
        expiresAt: new Date(Date.now() + HOLD_MS),
        bookedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
      });
    } catch (e) {
      if (e.code === 11000) {
        return fail(res, 409, "Khung giờ vừa được người khác đặt");
      }
      throw e;
    }

    const ipAddr =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const paymentUrl = vnpay.createPaymentUrl({
      amount: booking.amount,
      orderId: booking.code,
      orderInfo: `Thanh toan dat san ${booking.code}`,
      ipAddr,
    });

    return res.status(201).json({
      booking: publicBooking(booking),
      paymentUrl,
      walletBalance: 0,
    });
  } catch (error) {
    console.error(error);
    return fail(res, error.status || 500, error.message || "Đặt sân thất bại");
  }
};

module.exports.list = async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    const allowed = new Set(["all", "upcoming", "completed", "cancelled", "pending_payment"]);
    if (!allowed.has(filter)) return fail(res, 400, "Bộ lọc không hợp lệ");

    await slotService.expireStablePending();
    const all = await Booking.find({ userId: req.auth.userId }).sort({ createdAt: -1 });
    const counts = {
      all: all.length,
      upcoming: all.filter((b) => b.status === "upcoming").length,
      completed: all.filter((b) => b.status === "completed").length,
      cancelled: all.filter((b) => b.status === "cancelled").length,
    };
    const bookings = filter === "all" ? all : all.filter((b) => b.status === filter);
    return res.json({ filter, counts, bookings: bookings.map(publicBooking) });
  } catch (error) {
    return fail(res, 500, "Không tải được lịch đặt");
  }
};

module.exports.cancel = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      userId: req.auth.userId,
      code: req.params.code,
    });
    if (!booking) return fail(res, 404, "Không tìm thấy đơn đặt sân");
    if (!["upcoming", "pending_payment"].includes(booking.status)) {
      return fail(res, 400, "Không thể hủy đơn này");
    }
    booking.status = "cancelled";
    booking.statusLabel = "ĐÃ HỦY";
    await booking.save();
    return res.json({ booking: publicBooking(booking), walletBalance: 0 });
  } catch (error) {
    return fail(res, 500, "Hủy đơn thất bại");
  }
};