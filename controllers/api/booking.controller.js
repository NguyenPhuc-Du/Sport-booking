const catalog = require("../../services/catalog.service");
const store = require("../../services/user-app.store");

const PAYMENT_IDS = new Set(catalog.paymentMethods.map((item) => item.id));

function fail(res, status, message) {
  return res.status(status).json({ message });
}

function resolveSelection(body) {
  const facility = catalog.getFacility(body.facilityId);
  if (!facility) {
    const error = new Error("Không tìm thấy cơ sở");
    error.status = 404;
    throw error;
  }
  const court = catalog.getCourt(facility, body.courtId);
  if (!court) {
    const error = new Error("Không tìm thấy sân");
    error.status = 404;
    throw error;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) {
    const error = new Error("Ngày không hợp lệ");
    error.status = 400;
    throw error;
  }
  const slot = catalog.findSlot(body.date, body.time, (time) =>
    store.isSlotTaken(facility.id, court.id, body.date, time),
  );
  if (!slot) {
    const error = new Error("Khung giờ không tồn tại");
    error.status = 400;
    throw error;
  }
  if (!slot.available) {
    const error = new Error("Khung giờ đã được đặt hoặc đã qua");
    error.status = 409;
    throw error;
  }
  const quote = catalog.quotePrice(facility, slot, body.voucherCode);
  return { facility, court, slot, quote };
}

function publicBooking(booking) {
  const { userId, ...rest } = booking;
  return rest;
}

module.exports.quote = (req, res) => {
  try {
    const { quote, facility, court, slot } = resolveSelection(req.body);
    return res.json({
      facilityId: facility.id,
      facilityName: facility.name,
      courtId: court.id,
      courtName: court.name,
      date: req.body.date,
      time: `${slot.time} - ${String(Number(slot.time.slice(0, 2)) + 1).padStart(2, "0")}:00`,
      ...quote,
    });
  } catch (error) {
    return fail(res, error.status || 500, error.message || "Không tính được giá");
  }
};

module.exports.create = (req, res) => {
  try {
    const paymentMethod = req.body.paymentMethod;
    if (!PAYMENT_IDS.has(paymentMethod)) return fail(res, 400, "Phương thức thanh toán không hợp lệ");

    const { facility, court, slot, quote } = resolveSelection(req.body);
    const userId = String(req.auth.userId);

    if (paymentMethod === "wallet") {
      const balance = store.balanceOf(userId);
      if (balance < quote.amount) return fail(res, 400, "Số dư ví không đủ");
      store.setBalance(userId, balance - quote.amount);
    }

    const startHour = Number(slot.time.slice(0, 2));
    const end = `${String(startHour + 1).padStart(2, "0")}:00`;
    const booking = store.addBooking({
      userId,
      code: `SPZ-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "upcoming",
      statusLabel: "SẮP DIỄN RA",
      facilityId: facility.id,
      facilityName: facility.name,
      courtId: court.id,
      courtName: court.name,
      date: req.body.date,
      time: `${slot.time} - ${end}`,
      courtPrice: quote.courtPrice,
      discount: quote.discount,
      amount: quote.amount,
      voucherCode: quote.voucherCode,
      paymentMethod,
      bookedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
    });

    return res.status(201).json({
      booking: publicBooking(booking),
      walletBalance: store.balanceOf(userId),
    });
  } catch (error) {
    return fail(res, error.status || 500, error.message || "Đặt sân thất bại");
  }
};

module.exports.list = (req, res) => {
  const filter = req.query.filter || "all";
  const allowed = new Set(["all", "upcoming", "completed", "cancelled"]);
  if (!allowed.has(filter)) return fail(res, 400, "Bộ lọc không hợp lệ");
  const userId = String(req.auth.userId);
  return res.json({
    filter,
    counts: store.bookingCounts(userId),
    bookings: store.listBookings(userId, filter).map(publicBooking),
  });
};

module.exports.cancel = (req, res) => {
  const booking = store.findBooking(req.auth.userId, req.params.code);
  if (!booking) return fail(res, 404, "Không tìm thấy đơn đặt sân");
  if (booking.status !== "upcoming") return fail(res, 400, "Chỉ hủy được đơn sắp diễn ra");
  booking.status = "cancelled";
  booking.statusLabel = "ĐÃ HỦY";
  if (booking.paymentMethod === "wallet") {
    store.setBalance(req.auth.userId, store.balanceOf(req.auth.userId) + booking.amount);
  }
  return res.json({
    booking: publicBooking(booking),
    walletBalance: store.balanceOf(req.auth.userId),
  });
};
