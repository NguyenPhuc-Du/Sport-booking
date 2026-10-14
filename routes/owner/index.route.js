const systemConfig = require("../../config/system");
const localsOwner = require("../../middlewares/owner/locals.middleware");

const dashboardRoutes = require("../admin/dashboard.route");
const facilityRoutes = require("../admin/facility.route");
const bookingRoutes = require("../admin/booking.route");
const financeRoutes = require("../admin/finance.route");
const ownerProfileRoutes = require("../admin/owner-profile.route");

module.exports = (app) => {
  const PATH = systemConfig.prefixOwner;

  app.use(PATH, localsOwner);

  app.get(PATH, (req, res) => {
    res.redirect(PATH + "/dashboard");
  });

  app.use(PATH + "/dashboard", dashboardRoutes);
  app.use(PATH + "/facilities", facilityRoutes);
  app.use(PATH + "/bookings", bookingRoutes);
  app.use(PATH + "/finance", financeRoutes);
  app.use(PATH + "/profile", ownerProfileRoutes);

  // Giữ tương thích link cũ của chủ sân (không đụng /admin/dashboard của platform)
  app.get("/admin/facilities", (req, res) =>
    res.redirect(PATH + "/facilities"),
  );
  app.get("/admin/bookings", (req, res) => res.redirect(PATH + "/bookings"));
  app.get("/admin/finance", (req, res) => res.redirect(PATH + "/finance"));
};
