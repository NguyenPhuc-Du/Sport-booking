const asyncHandler = require("../../middlewares/admin/async-handler");
const statsService = require("../../services/admin/stats.service");

const venues = asyncHandler(async (req, res) => {
  const items = await statsService.listActiveVenues();
  res.render("admin/pages/platform/venues-readonly", {
    pageTitle: "Cơ sở đang chạy",
    activeMenu: "dashboard",
    items,
  });
});

const bookings = asyncHandler(async (req, res) => {
  const data = await statsService.listBookings();
  res.render("admin/pages/platform/bookings-readonly", {
    pageTitle: "Đơn đặt",
    activeMenu: "dashboard",
    exists: data.exists,
    items: data.items,
  });
});

module.exports = { venues, bookings };
