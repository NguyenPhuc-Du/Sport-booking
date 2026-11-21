const systemConfig = require("../../config/system");
const bookingService = require("../../services/owner/booking.service");

function timelinePath(date) {
  return `${systemConfig.prefixOwner}/bookings${date ? `?date=${date}` : ""}`;
}

function postedDate(body) {
  const date = String(body.date || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function listPath(body) {
  const params = new URLSearchParams();
  const keyword = String(body.keyword || "").trim().slice(0, 80);
  const venueId = String(body.venueId || "").trim();
  const status = String(body.status || "").trim();
  const dateFrom = String(body.dateFrom || "").trim();
  const dateTo = String(body.dateTo || "").trim();
  const page = String(body.page || "").trim();
  if (keyword) params.set("keyword", keyword);
  if (/^[a-f0-9]{24}$/i.test(venueId)) params.set("venueId", venueId);
  if (["pending_payment", "upcoming", "completed", "cancelled"].includes(status)) {
    params.set("status", status);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) params.set("dateFrom", dateFrom);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) params.set("dateTo", dateTo);
  if (/^\d+$/.test(page) && Number(page) > 1) params.set("page", String(Number(page)));
  const qs = params.toString();
  return `${systemConfig.prefixOwner}/bookings/list${qs ? `?${qs}` : ""}`;
}

function afterAction(req, res) {
  if (req.body.next === "list") return res.redirect(listPath(req.body));
  return res.redirect(timelinePath(postedDate(req.body)));
}

module.exports.index = async (req, res) => {
  const { date, dateMin, dateMax } = bookingService.resolveDate(req.query.date);
  if (req.query.date && req.query.date !== date) {
    return res.redirect(timelinePath(date));
  }

  const [year, month, day] = date.split("-");
  const ownerId = res.locals.user.id;
  const [rows, priceRules] = await Promise.all([
    bookingService.getTimelineRows(ownerId, date),
    bookingService.listCourtPrices(ownerId, date),
  ]);

  res.render("owner/pages/bookings/index", {
    pageTitle: "Lịch đặt & Timeline",
    activeMenu: "bookings",
    hours: bookingService.HOURS,
    dateLabel: `${day}/${month}/${year}`,
    dateValue: date,
    dateMin,
    dateMax,
    rows,
    priceRules,
    walkIn: bookingService.walkInLimits(date),
  });
};

module.exports.create = async (req, res) => {
  const date = postedDate(req.body);
  try {
    await bookingService.createWalkIn(res.locals.user.id, req.body);
    req.flash("success", "Đặt sân tại quầy thành công");
  } catch (error) {
    req.flash("error", error.message || "Đặt sân thất bại");
  }
  return res.redirect(timelinePath(date));
};

module.exports.list = async (req, res) => {
  const data = await bookingService.listAllBookings(res.locals.user.id, req.query);
  res.render("owner/pages/bookings/list", {
    pageTitle: "Danh sách đặt sân",
    activeMenu: "booking-list",
    ...data,
  });
};

module.exports.checkIn = async (req, res) => {
  const code = String(req.body.code || "").trim();
  await bookingService.checkIn(res.locals.user.id, code);
  return afterAction(req, res);
};

module.exports.cancel = async (req, res) => {
  const code = String(req.body.code || "").trim();
  await bookingService.cancel(res.locals.user.id, code);
  return afterAction(req, res);
};
