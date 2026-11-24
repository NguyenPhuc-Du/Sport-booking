const dashboardService = require("../../services/owner/dashboard.service");

module.exports.index = async (req, res) => {
  const data = await dashboardService.getOverview(res.locals.user.id, req.query.range);

  res.render("owner/pages/dashboard/index", {
    pageTitle: "Tổng quan & Thống kê",
    ...data,
  });
};

module.exports.bookings = async (req, res) => {
  const data = await dashboardService.listAllBookings(res.locals.user.id, req.query);

  res.render("owner/pages/dashboard/bookings", {
    pageTitle: "Tất cả đơn đặt sân",
    ...data,
  });
};

module.exports.courts = async (req, res) => {
  const data = await dashboardService.listCourtRevenue(res.locals.user.id, req.query);

  res.render("owner/pages/dashboard/courts", {
    pageTitle: "Thống kê sân theo doanh thu",
    ...data,
  });
};
