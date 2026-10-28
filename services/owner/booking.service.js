const mongoose = require("mongoose");
const Booking = require("../../models/booking.model");
const Court = require("../../models/court.model");
const PriceRule = require("../../models/price-rule.model");
const User = require("../../models/user.model");
const facilityService = require("./facility.service");
const { nowInVietnam } = require("../app/slot.service");
const cache = require("../../helpers/memory-cache");

const PRICE_TTL = 60 * 1000;

const HOURS = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
const DATE_MIN = "2026-10-20";

function formatPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return String(phone || "");
}

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")}đ`;
}

function shortCode(code) {
  const tail = String(code || "").slice(-4);
  return tail ? `#${tail}` : "";
}

async function ownerVenues(ownerId) {
  return facilityService.getAllVenueByOwnerId(ownerId);
}

async function timelineCourts(venues) {
  const venueIds = venues.map((venue) => venue._id);
  const venueName = new Map(venues.map((venue) => [String(venue._id), venue.name]));
  const courts = await facilityService.getCourtsByVenueIds(venueIds);
  return courts
    .map((court) => ({
      ...court,
      venueName: venueName.get(String(court.venue_id)) || "",
    }))
    .sort((a, b) => {
      const byVenue = String(a.venueName).localeCompare(String(b.venueName), "vi");
      if (byVenue !== 0) return byVenue;
      return String(a.name || "").localeCompare(String(b.name || ""), "vi");
    });
}

function hoursInRange(timeStart, timeEnd) {
  const start = Number(String(timeStart || "").slice(0, 2));
  const end = Number(String(timeEnd || "").slice(0, 2));
  const hours = [];
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
    const hour = String(timeStart || "").slice(0, 2);
    if (HOURS.includes(hour)) hours.push(hour);
    return hours;
  }
  for (let hour = start; hour < end; hour += 1) {
    const key = String(hour).padStart(2, "0");
    if (HOURS.includes(key)) hours.push(key);
  }
  return hours;
}

function nextBookableStart(now) {
  const hour = Number(now.time.slice(0, 2));
  const startHour = hour < 6 ? 6 : hour;
  return `${String(startHour).padStart(2, "0")}:00`;
}

function walkInLimits(date) {
  const now = nowInVietnam();
  const blocked = { allowed: false, startMin: "06:00", endMin: "07:00" };
  if (date < now.date) {
    return { ...blocked, reason: "Không thể đặt sân trong quá khứ" };
  }
  if (date > now.date) {
    return { allowed: true, startMin: "06:00", endMin: "07:00", reason: "" };
  }
  const startMin = nextBookableStart(now);
  if (startMin > "21:00") {
    return { ...blocked, reason: "Đã hết khung giờ có thể đặt trong hôm nay" };
  }
  const endMin = `${String(Number(startMin.slice(0, 2)) + 1).padStart(2, "0")}:00`;
  return { allowed: true, startMin, endMin, reason: "" };
}

function resolveDate(queryDate) {
  const today = nowInVietnam().date;
  const dateMax = today < DATE_MIN ? DATE_MIN : today;

  let date = queryDate || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = dateMax;
  if (date < DATE_MIN) date = DATE_MIN;
  if (date > dateMax) date = dateMax;
  
  return { date, dateMin: DATE_MIN, dateMax };
}

async function getTimelineRows(ownerId, date) {
  const venues = await ownerVenues(ownerId);
  const venueIds = venues.map((venue) => venue._id);
  const courts = await timelineCourts(venues);

  const bookings = await Booking.find({
    facilityId: { $in: venueIds },
    courtId: { $in: courts.map((court) => court._id) },
    date,
    status: { $in: ["pending_payment", "upcoming", "completed"] },
  }).populate("userId", "fullName phone").select("courtId courtName timeStart timeEnd date code userId guestName guestPhone amount status").lean();

  const slotsByCourt = {};
  for (const booking of bookings) {
    const key = String(booking.courtId);
    if (!slotsByCourt[key]) slotsByCourt[key] = {};
    const customer = booking.userId || {};
    const slot = {
      name: booking.guestName || customer.fullName || "",
      id: booking.code,
      shortId: shortCode(booking.code),
      phone: formatPhone(booking.guestPhone || customer.phone),
      court: booking.courtName || "",
      time: `${booking.timeStart} - ${booking.timeEnd} (${booking.date})`,
      amount: formatMoney(booking.amount),
      status: booking.status,
    };
    for (const hour of hoursInRange(booking.timeStart, booking.timeEnd)) {
      if (!slotsByCourt[key][hour]) slotsByCourt[key][hour] = slot;
    }
  }

  const rows = courts.map((court) => ({
    id: String(court._id),
    name: court.name,
    venue: court.venueName,
    status: court.status === "active" ? "open" : "maintenance",
    slots: slotsByCourt[String(court._id)] || {},
  }));

  const courtsByVenue = new Set(courts.map((court) => String(court.venue_id)));
  for (const venue of venues) {
    if (courtsByVenue.has(String(venue._id))) continue;
    rows.push({
      name: venue.name,
      venue: "",
      status: "empty",
      slots: {},
    });
  }

  rows.sort((a, b) => {
    const groupA = a.venue || a.name;
    const groupB = b.venue || b.name;
    const byVenue = String(groupA).localeCompare(String(groupB), "vi");
    if (byVenue !== 0) return byVenue;
    return String(a.name).localeCompare(String(b.name), "vi");
  });

  return rows;
}

function hourValue(value) {
  const match = String(value || "").trim().match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function dayTypeOf(dateStr) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return h * 60 + m;
}

function ruleCovers(rule, minute) {
  return minute >= toMinutes(rule.timeStart) && minute < toMinutes(rule.timeEnd);
}

function quoteRange(rules, timeStart, timeEnd) {
  const start = toMinutes(timeStart);
  const end = toMinutes(timeEnd);
  if (!(end > start)) return null;
  let total = 0;
  for (let minute = start; minute < end; minute += 60) {
    const rule = rules.find((item) => ruleCovers(item, minute));
    if (!rule) return null;
    total += Number(rule.pricePerHour) || 0;
  }
  return total;
}

async function rulesForCourt(courtId, date) {
  const dayType = dayTypeOf(date);
  return cache.remember(`price:${courtId}:${dayType}`, PRICE_TTL, () => {
    return PriceRule.find({
      court: courtId,
      status: "active",
      dayType: { $in: [dayType, "all"] },
    })
      .select("timeStart timeEnd pricePerHour")
      .lean();
  });
}

async function listCourtPrices(ownerId, date) {
  const courts = await timelineCourts(await ownerVenues(ownerId));
  const courtIds = courts.filter((court) => court.status === "active").map((court) => court._id);
  const dayType = dayTypeOf(date);
  const rules = await cache.remember(`price:owner:${ownerId}:${date}`, PRICE_TTL, () => {
    return PriceRule.find({
      court: { $in: courtIds },
      status: "active",
      dayType: { $in: [dayType, "all"] },
    })
      .select("court timeStart timeEnd pricePerHour")
      .lean();
  });

  return rules.map((rule) => ({
    courtId: String(rule.court),
    timeStart: rule.timeStart,
    timeEnd: rule.timeEnd,
    pricePerHour: rule.pricePerHour,
  }));
}

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

async function createWalkIn(ownerId, body) {
  const courtId = String(body.court || "").trim();
  if (!mongoose.Types.ObjectId.isValid(courtId)) throw fail("Vui lòng chọn sân");

  const posted = String(body.date || "");
  const { date } = resolveDate(posted);
  if (posted !== date) throw fail("Ngày đặt không hợp lệ");

  const timeStart = hourValue(body.timeStart);
  const timeEnd = hourValue(body.timeEnd);
  if (!/^(0[6-9]|1\d|2[01]):00$/.test(timeStart)) throw fail("Giờ bắt đầu không hợp lệ");
  if (!/^(0[7-9]|1\d|2[0-2]):00$/.test(timeEnd) || timeEnd <= timeStart) {
    throw fail("Giờ kết thúc phải sau giờ bắt đầu");
  }
  const limits = walkInLimits(date);
  if (!limits.allowed) throw fail(limits.reason);
  if (timeStart < limits.startMin) throw fail("Chỉ được đặt từ thời điểm hiện tại trở đi");

  const customer = String(body.customer || "").trim();
  if (!customer) throw fail("Vui lòng nhập tên khách");

  const phone = String(body.phone || "").replace(/\D/g, "");
  if (!/^0\d{9}$/.test(phone)) throw fail("Số điện thoại phải gồm 10 số và bắt đầu bằng 0");

  const venues = await ownerVenues(ownerId);
  const court = await Court.findOne({
    _id: courtId,
    venue_id: { $in: venues.map((venue) => venue._id) },
    deleted: { $ne: true },
    status: "active",
  }).lean();
  if (!court) throw fail("Sân không tồn tại hoặc đang bảo trì");

  const amount = quoteRange(await rulesForCourt(court._id, date), timeStart, timeEnd);
  if (amount == null) throw fail("Khung giờ chưa có bảng giá");

  const venue = venues.find((item) => String(item._id) === String(court.venue_id));
  const overlap = await Booking.findOne({
    courtId: court._id,
    date,
    status: { $in: ["pending_payment", "upcoming", "completed"] },
    timeStart: { $lt: timeEnd },
    timeEnd: { $gt: timeStart },
  })
    .select("_id")
    .lean();
  if (overlap) throw fail("Khung giờ đã có đơn đặt");

  const user = await User.findOne({ phone }).select("_id").lean();

  try {
    await Booking.create({
      ...(user ? { userId: user._id } : {}),
      guestName: customer,
      guestPhone: phone,
      code: `SPZ${Date.now()}`,
      status: "upcoming",
      statusLabel: "SẮP DIỄN RA",
      facilityId: court.venue_id,
      facilityName: venue ? venue.name : "",
      courtId: court._id,
      courtName: court.name,
      date,
      timeStart,
      timeEnd,
      time: `${timeStart} - ${timeEnd}`,
      courtPrice: amount,
      discount: 0,
      amount,
      paymentMethod: body.paymentMethod === "cash" ? "cash" : "vnpay",
      paidAt: new Date(),
      bookedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
    });
  } catch (error) {
    if (error.code === 11000) throw fail("Khung giờ vừa được đặt");
    throw error;
  }
}

async function checkIn(ownerId, code) {
  const venueIds = (await ownerVenues(ownerId)).map((venue) => venue._id);
  return Booking.updateOne(
    {
      code,
      facilityId: { $in: venueIds },
      status: { $in: ["pending_payment", "upcoming"] },
    },
    { $set: { status: "completed", statusLabel: "HOÀN THÀNH" } },
  );
}

async function cancel(ownerId, code) {
  const venueIds = (await ownerVenues(ownerId)).map((venue) => venue._id);
  return Booking.updateOne(
    {
      code,
      facilityId: { $in: venueIds },
      status: { $in: ["pending_payment", "upcoming", "completed"] },
    },
    { $set: { status: "cancelled", statusLabel: "ĐÃ HỦY" } },
  );
}

module.exports = {
  HOURS,
  resolveDate,
  walkInLimits,
  getTimelineRows,
  listCourtPrices,
  createWalkIn,
  checkIn,
  cancel,
};
