const mongoose = require("mongoose");
const Booking = require("../../models/booking.model");
const Court = require("../../models/court.model");
const PriceRule = require("../../models/price-rule.model");
const User = require("../../models/user.model");
const facilityService = require("./facility.service");
const { nowInVietnam, expireStablePending, quotePrice } = require("../app/slot.service");
const {
  advanceDateMax,
  listUsableVouchers,
  assertVoucherScopes,
  consumeVoucherUses,
  releaseVoucherUses,
} = require("./voucher-quay.service");
const cache = require("../../helpers/memory-cache");
const ledger = require("../admin/ledger.service");
const paginationHelper = require("../../helpers/pagination");
const { objectIds, applyRange, applyAmountRange, applyVenue, sumAmount } = require("../../helpers/loc-phieu");

const PRICE_TTL = 60 * 1000;

const HOURS = Array.from({ length: 16 }, (_, index) => String(index + 6).padStart(2, "0"));
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

async function ownerVenueIds(ownerId) {
  const venues = await ownerVenues(ownerId);
  return venues.map((venue) => venue._id);
}

async function timelineCourts(venues) {
  const venueIds = venues.map((venue) => venue._id);
  const venueName = new Map(
    venues.map((venue) => [String(venue._id), venue.name]),
  );
  const courts = await facilityService.getCourtsByVenueIds(venueIds);
  return courts
    .map((court) => ({
      ...court,
      venueName: venueName.get(String(court.venue_id)) || "",
    }))
    .sort((a, b) => {
      const byVenue = String(a.venueName).localeCompare(
        String(b.venueName),
        "vi",
      );
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
  const [hourText, minuteText] = String(now.time || "00:00").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 6)
    return "06:00";
  // Khung HH:00 chỉ đặt được khi chưa tới. 07:21 thì khung 07:00 đã bắt đầu, mốc kế là 08:00.
  return `${String(hour + 1).padStart(2, "0")}:00`;
}

function walkInLimits(date) {
  const now = nowInVietnam();
  const blocked = { allowed: false, startMin: "06:00", endMin: "07:00" };
  const horizon = advanceDateMax(now.date);
  if (date < now.date) {
    return { ...blocked, reason: "Không thể đặt sân trong quá khứ" };
  }
  if (date > horizon) {
    return { ...blocked, reason: "Chỉ được đặt trước trong vòng 1 tháng" };
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
  const horizon = advanceDateMax(today);
  const dateMax = horizon < DATE_MIN ? DATE_MIN : horizon;
  const todayOrMin = today < DATE_MIN ? DATE_MIN : today;

  let date = queryDate || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayOrMin;
  if (date < DATE_MIN) date = DATE_MIN;
  if (date > dateMax) date = dateMax;

  return { date, dateMin: DATE_MIN, dateMax };
}

async function getTimelineRows(ownerId, date) {
  await expireStablePending();
  const venues = await ownerVenues(ownerId);
  const venueIds = venues.map((venue) => venue._id);
  const courts = await timelineCourts(venues);

  const bookings = await Booking.find({
    facilityId: { $in: venueIds },
    courtId: { $in: courts.map((court) => court._id) },
    date,
    status: { $in: ["pending_payment", "upcoming", "completed"] },
  })
    .populate("userId", "fullName phone")
    .select(
      "courtId courtName timeStart timeEnd date code userId guestName guestPhone amount status",
    )
    .lean();

  const slotsByCourt = {};
  const seen = new Set();
  let tongTien = 0;
  for (const booking of bookings) {
    if (!seen.has(booking.code)) {
      seen.add(booking.code);
      tongTien += Number(booking.amount) || 0;
    }
    const key = String(booking.courtId);
    if (!slotsByCourt[key]) slotsByCourt[key] = {};
    const customer = customerOf(booking);
    const slot = {
      name: customer.name || "Đã có người đặt",
      id: booking.code,
      shortId: shortCode(booking.code),
      phone: customer.phone,
      court: booking.courtName || "",
      time: `${booking.timeStart} - ${booking.timeEnd} (${booking.date})`,
      date: booking.date,
      start: booking.timeStart,
      amount: formatMoney(booking.amount),
      status: booking.status,
    };
    for (const hour of hoursInRange(booking.timeStart, booking.timeEnd)) {
      if (!slotsByCourt[key][hour]) slotsByCourt[key][hour] = slot;
    }
  }

  const rows = courts.map((court) => ({
    id: String(court._id),
    venueId: String(court.venue_id || ""),
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

  return { rows, thongKe: { soDon: seen.size, tongTien } };
}

const BOOKING_STATUS_LABEL = {
  pending_payment: "Chờ thanh toán",
  upcoming: "Đã đặt lịch",
  completed: "Đã check-in",
  cancelled: "Đã hủy",
};

function labelDate(date) {
  const [year, month, day] = String(date || "").split("-");
  return day && month && year ? `${day}/${month}/${year}` : "";
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bookingListQuery(venues, query) {
  const find = {};
  const filter = {
    keyword: "",
    venueId: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  };

  const keyword = String(query.keyword || "").trim();
  if (keyword) filter.keyword = keyword.slice(0, 80);

  filter.venueId = applyVenue(find, "facilityId", venues.map((venue) => venue._id), query.venueId);

  const status = String(query.status || "");
  if (Object.prototype.hasOwnProperty.call(BOOKING_STATUS_LABEL, status)) {
    find.status = status;
    filter.status = status;
  }

  let dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(query.dateFrom || "")) ? String(query.dateFrom) : "";
  let dateTo = /^\d{4}-\d{2}-\d{2}$/.test(String(query.dateTo || "")) ? String(query.dateTo) : "";
  if (dateFrom && dateTo && dateFrom > dateTo) {
    const swap = dateFrom;
    dateFrom = dateTo;
    dateTo = swap;
  }
  applyRange(find, "date", dateFrom, dateTo);
  filter.dateFrom = dateFrom;
  filter.dateTo = dateTo;

  const range = applyAmountRange(find, query);
  filter.minAmount = range.minAmount;
  filter.maxAmount = range.maxAmount;

  return { find, filter };
}

async function applyKeyword(find, keyword) {
  if (!keyword) return;
  const regex = new RegExp(escapeRegex(keyword), "i");
  const digits = keyword.replace(/\D/g, "");
  const or = [
    { code: regex },
    { guestName: regex },
    { courtName: regex },
    { facilityName: regex },
  ];
  if (digits) or.push({ guestPhone: new RegExp(escapeRegex(digits)) });

  const userOr = [{ fullName: regex }];
  if (digits) userOr.push({ phone: new RegExp(escapeRegex(digits)) });
  const users = await User.find({ $or: userOr }).select("_id").limit(50).lean();
  if (users.length) or.push({ userId: { $in: users.map((user) => user._id) } });
  find.$or = or;
}

function customerOf(booking) {
  const customer = booking.userId && typeof booking.userId === "object" ? booking.userId : {};
  return {
    name: booking.guestName || customer.fullName || "",
    phone: formatPhone(booking.guestPhone || customer.phone),
  };
}

function mapBookingRow(booking) {
  const customer = customerOf(booking);
  return {
    code: booking.code,
    name: customer.name,
    phone: customer.phone,
    venue: booking.facilityName || "",
    court: booking.courtName || "",
    date: labelDate(booking.date),
    time: `${booking.timeStart} - ${booking.timeEnd}`,
    timeLabel: `${booking.timeStart} - ${booking.timeEnd} (${labelDate(booking.date)})`,
    amount: formatMoney(booking.amount),
    amountNumber: Number(booking.amount) || 0,
    status: booking.status,
    statusLabel: BOOKING_STATUS_LABEL[booking.status] || booking.status,
  };
}

const BOOKING_LIST_SELECT =
  "code guestName guestPhone facilityName courtName timeStart timeEnd date amount status userId";

async function loadBookingFilter(ownerId, query) {
  const venues = await ownerVenues(ownerId);
  const { find, filter } = bookingListQuery(venues, query);
  await applyKeyword(find, filter.keyword);
  return { venues, find, filter };
}

const totalsForFilter = (find) => sumAmount(Booking, find, "soDon");

function queryBookings(find, pagination) {
  let query = Booking.find(find)
    .populate("userId", "fullName phone")
    .select(BOOKING_LIST_SELECT)
    .sort({ date: -1, timeStart: -1, courtName: 1 });
  if (pagination) query = query.skip(pagination.skipPage).limit(pagination.limitPage);
  return query.lean();
}

async function listAllBookings(ownerId, query = {}) {
  const { venues, find, filter } = await loadBookingFilter(ownerId, query);
  const tong = await totalsForFilter(find);
  const pagination = paginationHelper({ limitPage: 8 }, query, tong.soDon);
  const docs = tong.soDon ? await queryBookings(find, pagination) : [];

  return {
    bookings: docs.map(mapBookingRow),
    venues: venues.map((venue) => ({ _id: venue._id, name: venue.name })),
    filter,
    pagination,
    total: tong.soDon,
    tongTien: tong.tongTien,
    soDon: tong.soDon,
  };
}

async function listBookingsForExport(ownerId, query = {}) {
  const { find } = await loadBookingFilter(ownerId, query);
  const docs = await queryBookings(find);
  return docs.map(mapBookingRow);
}

async function findOwnedByCode(ownerId, code) {
  const codeText = String(code || "").trim();
  if (!codeText) return null;
  const ids = objectIds(await ownerVenueIds(ownerId));
  const booking = await Booking.findOne({ code: codeText, facilityId: { $in: ids } })
    .populate("userId", "fullName phone")
    .lean();
  if (!booking) return null;
  const customer = customerOf(booking);
  booking.customerName = customer.name;
  booking.customerPhone = customer.phone;
  return booking;
}

function hourValue(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function dayTypeOf(dateStr) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || "0:0")
    .split(":")
    .map(Number);
  return h * 60 + m;
}

function ruleCovers(rule, minute) {
  return (
    minute >= toMinutes(rule.timeStart) && minute < toMinutes(rule.timeEnd)
  );
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
  const courtIds = courts
    .filter((court) => court.status === "active")
    .map((court) => court._id);
  const dayType = dayTypeOf(date);
  const rules = await cache.remember(
    `price:owner:${ownerId}:${date}`,
    PRICE_TTL,
    () => {
      return PriceRule.find({
        court: { $in: courtIds },
        status: "active",
        dayType: { $in: [dayType, "all"] },
      })
        .select("court timeStart timeEnd pricePerHour")
        .lean();
    },
  );

  return rules.map((rule) => ({
    courtId: String(rule.court),
    timeStart: rule.timeStart,
    timeEnd: rule.timeEnd,
    pricePerHour: rule.pricePerHour,
  }));
}

async function listWalkInVouchers(ownerId) {
  return listUsableVouchers(await ownerVenueIds(ownerId));
}

function postedVoucherCodes(body, fields) {
  return [
    ...new Set(
      fields
        .map((field) => String(body[field] || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

async function createWalkIn(ownerId, body) {
  const courtId = String(body.court || "").trim();
  if (!mongoose.Types.ObjectId.isValid(courtId))
    throw fail("Vui lòng chọn sân");

  const posted = String(body.date || "");
  const { date, dateMax } = resolveDate(posted);
  if (posted !== date) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(posted);
    if (iso && posted > dateMax) throw fail("Chỉ được đặt trước trong vòng 1 tháng");
    if (iso && posted < date) throw fail("Không thể đặt sân trong quá khứ");
    throw fail("Ngày đặt không hợp lệ");
  }

  const timeStart = hourValue(body.timeStart);
  const timeEnd = hourValue(body.timeEnd);
  if (!/^(0[6-9]|1\d|2[01]):00$/.test(timeStart))
    throw fail("Giờ bắt đầu không hợp lệ");
  if (!/^(0[7-9]|1\d|2[0-2]):00$/.test(timeEnd) || timeEnd <= timeStart) {
    throw fail("Giờ kết thúc phải sau giờ bắt đầu");
  }
  const limits = walkInLimits(date);
  if (!limits.allowed) throw fail(limits.reason);
  if (timeStart < limits.startMin) {
    throw fail(
      `Khung ${timeStart} đã qua giờ. Chỉ được đặt từ ${limits.startMin} trở đi`,
    );
  }

  const customer = String(body.customer || "").trim();
  if (!customer) throw fail("Vui lòng nhập tên khách");

  const phone = String(body.phone || "").replace(/\D/g, "");
  if (!/^0\d{9}$/.test(phone))
    throw fail("Số điện thoại phải gồm 10 số và bắt đầu bằng 0");

  const venues = await ownerVenues(ownerId);
  const court = await Court.findOne({
    _id: courtId,
    venue_id: { $in: venues.map((venue) => venue._id) },
    deleted: { $ne: true },
    status: "active",
  }).lean();
  if (!court) throw fail("Sân không tồn tại hoặc đang bảo trì");

  const courtPrice = quoteRange(
    await rulesForCourt(court._id, date),
    timeStart,
    timeEnd,
  );
  if (courtPrice == null) throw fail("Khung giờ chưa có bảng giá");

  const voucherCodes = postedVoucherCodes(body, ["voucherCourt", "voucherOrder"]);
  await assertVoucherScopes(
    voucherCodes,
    ["court", "order"],
    "Đặt sân tại quầy chỉ áp dụng voucher tiền sân và hoá đơn",
  );
  const quote = await quotePrice({
    courtPrice,
    drinks: [],
    drinkTotal: 0,
    date,
    timeStart,
    venueId: court.venue_id,
    voucherCodes,
  });

  const venue = venues.find(
    (item) => String(item._id) === String(court.venue_id),
  );
  await expireStablePending();
  const overlap = await Booking.findOne({
    courtId: court._id,
    date,
    status: { $in: ["pending_payment", "upcoming", "completed"] },
    timeStart: { $lt: timeEnd },
    timeEnd: { $gt: timeStart },
  })
    .select("_id")
    .lean();
  if (overlap) throw fail("Khung giờ này đã có người đặt");

  const user = await User.findOne({ phone }).select("_id").lean();
  const consumed = await consumeVoucherUses(quote.voucherCodes);

  try {
    const booking = await Booking.create({
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
      courtPrice,
      discount: quote.discount,
      amount: quote.amount,
      voucherCode: quote.voucherCode || "",
      paymentMethod: body.paymentMethod === "cash" ? "cash" : "vnpay",
      paidAt: new Date(),
      bookedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
    });
    try {
      await ledger.recordPaidBooking(booking);
    } catch (error) {
      console.error(error);
    }
    return booking;
  } catch (error) {
    await releaseVoucherUses(consumed);
    if (error.code === 11000) throw fail("Khung giờ này đã có người đặt");
    throw error;
  }
}

async function checkIn(ownerId, code) {
  const venueIds = await ownerVenueIds(ownerId);
  const booking = await Booking.findOne({
    code,
    facilityId: { $in: venueIds },
    status: { $in: ["pending_payment", "upcoming"] },
  }).select("date timeStart");
  if (!booking) return { matchedCount: 0 };
  const now = nowInVietnam();
  const tooEarly = booking.date > now.date || (booking.date === now.date && booking.timeStart > now.time);
  if (tooEarly) {
    throw fail(`Chưa tới giờ check-in. Chỉ check-in từ ${booking.timeStart} ngày ${labelDate(booking.date)}`);
  }
  return Booking.updateOne(
    { _id: booking._id, status: { $in: ["pending_payment", "upcoming"] } },
    { $set: { status: "completed", statusLabel: "HOÀN THÀNH" } },
  );
}

async function cancel(ownerId, code) {
  const venueIds = await ownerVenueIds(ownerId);
  const booking = await Booking.findOne({
    code,
    facilityId: { $in: venueIds },
    status: { $in: ["pending_payment", "upcoming", "completed"] },
  });
  if (!booking) return { matchedCount: 0 };
  const result = await Booking.updateOne(
    { _id: booking._id },
    { $set: { status: "cancelled", statusLabel: "ĐÃ HỦY" } },
  );
  try {
    await ledger.recordRefund(booking);
  } catch (error) {
    console.error(error);
  }
  return result;
}

module.exports = {
  HOURS,
  STATUS_LABEL: BOOKING_STATUS_LABEL,
  resolveDate,
  walkInLimits,
  getTimelineRows,
  listAllBookings,
  listBookingsForExport,
  findOwnedByCode,
  listCourtPrices,
  listWalkInVouchers,
  createWalkIn,
  checkIn,
  cancel,
};
