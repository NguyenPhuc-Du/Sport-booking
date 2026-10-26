const Booking = require("../../models/booking.model");
const facilityService = require("./facility.service");
const drinkService = require("./drink.service");
const slotService = require("./slot.service");
const vnpay = require("./vnpay.service");

const HOLD_MS = 15 * 60 * 1000;
const FILTERS = new Set(["all", "upcoming", "completed", "cancelled", "pending_payment"]);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
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
    drinks: (b.drinks || []).map((item) => ({
      drinkId: String(item.drinkId),
      name: item.name,
      price: item.price,
      qty: item.qty,
    })),
    drinkTotal: b.drinkTotal || 0,
    amount: b.amount,
    voucherCode: b.voucherCode,
    paymentMethod: b.paymentMethod,
    bookedAt: b.bookedAt,
  };
}

function hoursOf(body) {
  const hours = Number(body.hours || 1);
  if (!Number.isInteger(hours) || hours < 1 || hours > 3) {
    throw httpError(400, "Chỉ đặt được từ 1 đến 3 khung giờ liền nhau");
  }
  return hours;
}

async function resolveSelection(body) {
  const pair = await facilityService.getVenueAndCourt(body.facilityId, body.courtId);
  if (!pair) throw httpError(404, "Không tìm thấy cơ sở hoặc sân");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) {
    throw httpError(400, "Ngày không hợp lệ");
  }

  const hours = hoursOf(body);
  const startMin = toMinutes(body.time);
  const slots = [];
  for (let i = 0; i < hours; i += 1) {
    const time = slotService.fromMinutes(startMin + i * 60);
    const slot = await slotService.findSlot(pair.venue, pair.court._id, body.date, time);
    if (!slot) throw httpError(400, "Khung giờ không tồn tại hoặc chưa có bảng giá");
    if (!slot.available) throw httpError(409, "Một trong các khung giờ đã được đặt hoặc đã qua");
    slots.push(slot);
  }

  const courtPrice = slots.reduce((sum, slot) => sum + slot.price, 0);
  const quote = await slotService.quotePrice(
    { price: courtPrice },
    body.voucherCode,
    pair.venue._id,
  );
  const { drinks, drinkTotal } = await drinkService.snapshotDrinks(
    pair.venue._id,
    body.drinks,
  );
  const start = slots[0].time;
  const end = slotService.fromMinutes(startMin + hours * 60);
  return {
    venue: pair.venue,
    court: pair.court,
    slots,
    quote: {
      ...quote,
      drinks,
      drinkTotal,
      amount: quote.amount + drinkTotal,
    },
    start,
    end,
  };
}

async function quote(body) {
  const { venue, court, quote: price, start, end } = await resolveSelection(body);
  return {
    facilityId: String(venue._id),
    facilityName: venue.name,
    courtId: String(court._id),
    courtName: court.name,
    date: body.date,
    time: `${start} - ${end}`,
    ...price,
  };
}

async function create({ userId, body, ipAddr }) {
  if ((body.paymentMethod || "vnpay") !== "vnpay") {
    throw httpError(400, "Chỉ hỗ trợ thanh toán VNPay");
  }

  await slotService.expireStablePending();
  const { venue, court, quote, start, end } = await resolveSelection(body);
  const code = `SPZ${Date.now()}`;

  await drinkService.decrementStock(quote.drinks);

  let booking;
  try {
    booking = await Booking.create({
      userId,
      code,
      status: "pending_payment",
      statusLabel: "CHỜ THANH TOÁN",
      facilityId: venue._id,
      facilityName: venue.name,
      courtId: court._id,
      courtName: court.name,
      date: body.date,
      timeStart: start,
      timeEnd: end,
      time: `${start} - ${end}`,
      courtPrice: quote.courtPrice,
      discount: quote.discount,
      drinks: quote.drinks,
      drinkTotal: quote.drinkTotal,
      amount: quote.amount,
      voucherCode: quote.voucherCode,
      paymentMethod: "vnpay",
      expiresAt: new Date(Date.now() + HOLD_MS),
      bookedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
    });
  } catch (error) {
    await drinkService.restoreStock(quote.drinks);
    if (error.code === 11000) throw httpError(409, "Khung giờ vừa được người khác đặt");
    throw error;
  }

  const paymentUrl = vnpay.createPaymentUrl({
    amount: booking.amount,
    orderId: booking.code,
    orderInfo: `Thanh toan dat san ${booking.code}`,
    ipAddr: ipAddr || "127.0.0.1",
  });

  return { booking: publicBooking(booking), paymentUrl };
}

async function list(userId, filter = "all") {
  if (!FILTERS.has(filter)) throw httpError(400, "Bộ lọc không hợp lệ");

  await slotService.expireStablePending();
  await slotService.completePastBookings({ userId });
  const all = await Booking.find({ userId }).sort({ createdAt: -1 });
  const counts = {
    all: all.length,
    pendingPayment: all.filter((b) => b.status === "pending_payment").length,
    upcoming: all.filter((b) => b.status === "upcoming").length,
    completed: all.filter((b) => b.status === "completed").length,
    cancelled: all.filter((b) => b.status === "cancelled").length,
  };
  const bookings = filter === "all" ? all : all.filter((b) => b.status === filter);
  return { filter, counts, bookings: bookings.map(publicBooking) };
}

async function cancel(userId, code) {
  const booking = await Booking.findOneAndUpdate(
    { userId, code, status: { $in: ["upcoming", "pending_payment"] } },
    { $set: { status: "cancelled", statusLabel: "ĐÃ HỦY" } },
    { returnDocument: "after" },
  );
  if (!booking) throw httpError(400, "Không thể hủy đơn này");
  await drinkService.releaseDrinks(booking._id);
  return { booking: publicBooking(booking) };
}

module.exports = { quote, create, list, cancel };
