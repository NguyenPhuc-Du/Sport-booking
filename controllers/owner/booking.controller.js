const systemConfig = require("../../config/system");
const bookingService = require("../../services/owner/booking.service");

function timelinePath(date) {
  return `${systemConfig.prefixOwner}/bookings${date ? `?date=${date}` : ""}`;
}

function postedDate(body) {
  const date = String(body.date || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
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

module.exports.checkIn = async (req, res) => {
  const code = String(req.body.code || "").trim();
  await bookingService.checkIn(res.locals.user.id, code);
  return res.redirect(timelinePath(postedDate(req.body)));
};

module.exports.cancel = async (req, res) => {
  const code = String(req.body.code || "").trim();
  await bookingService.cancel(res.locals.user.id, code);
  return res.redirect(timelinePath(postedDate(req.body)));
};
