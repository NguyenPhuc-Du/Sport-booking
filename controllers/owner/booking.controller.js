const systemConfig = require("../../config/system");
const bookingService = require("../../services/owner/booking.service");
const { taiExcel } = require("../../helpers/xuat-excel");
const { xuatPhieu, tien } = require("../../helpers/xuat-pdf");

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
  const [timeline, priceRules] = await Promise.all([
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
    rows: timeline.rows,
    thongKe: timeline.thongKe,
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

module.exports.exportList = async (req, res) => {
  const rows = await bookingService.listBookingsForExport(res.locals.user.id, req.query);
  await taiExcel(
    res,
    "dat-san.xlsx",
    [
      { header: "Mã đơn", key: "code", width: 22 },
      { header: "Ngày", key: "date", width: 14 },
      { header: "Giờ", key: "time", width: 16 },
      { header: "Khách", key: "name", width: 24 },
      { header: "Số điện thoại", key: "phone", width: 16 },
      { header: "Sân", key: "court", width: 18 },
      { header: "Cơ sở", key: "venue", width: 24 },
      { header: "Trạng thái", key: "statusLabel", width: 16 },
      { header: "Tổng tiền", key: "amountNumber", width: 14 },
    ],
    rows,
  );
};

module.exports.bookingPdf = async (req, res) => {
  const booking = await bookingService.findOwnedByCode(
    res.locals.user.id,
    req.params.code,
  );
  if (!booking) return res.status(404).type("text/plain").send("Không thấy đơn đặt sân");
  const drinks = booking.drinks || [];
  const phanTien = [["Tiền sân", tien(booking.courtPrice)]];
  if (Number(booking.discount) > 0) phanTien.push(["Giảm giá", "− " + tien(booking.discount)]);
  if (drinks.length) phanTien.push(["Tiền nước", tien(booking.drinkTotal)]);
  const [year, month, day] = String(booking.date || "").split("-");
  const ngay = year && month && day ? `${day}/${month}/${year}` : booking.date;
  const trangThai = {
    pending_payment: "Chờ thanh toán",
    upcoming: "Đã đặt lịch",
    completed: "Đã check-in",
    cancelled: "Đã hủy",
  };
  xuatPhieu(res, `${booking.code}.pdf`, {
    tieuDe: "Phiếu đặt sân",
    thongTin: [
      ["Mã đơn", booking.code],
      ["Khách", booking.customerName],
      ["Số điện thoại", booking.customerPhone],
      ["Cơ sở", booking.facilityName],
      ["Sân", booking.courtName],
      ["Ngày", ngay],
      ["Giờ", `${booking.timeStart} - ${booking.timeEnd}`],
      ["Trạng thái", trangThai[booking.status] || booking.statusLabel || booking.status],
    ],
    tieuDeMon: drinks.length ? "Đồ uống" : undefined,
    mon: drinks.length
      ? drinks.map((line) => ({
          ten: line.name,
          sl: line.qty,
          tien: tien((Number(line.price) || 0) * (Number(line.qty) || 0)),
        }))
      : undefined,
    phanTien,
    tongNhan: "Tổng tiền",
    tong: tien(booking.amount),
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
