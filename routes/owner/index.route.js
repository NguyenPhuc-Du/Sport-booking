const systemConfig = require("../../config/system");
const localsOwner = require("../../middlewares/owner/locals.middleware");

const dashboardRoutes = require("./dashboard.route");
const facilityRoutes = require("./facility.route");
const bookingRoutes = require("./booking.route");
const financeRoutes = require("./finance.route");
const ownerProfileRoutes = require("./owner-profile.route");
const refreshmentRoutes = require("./refreshment.route");

const authMiddleware = require("../../middlewares/auth.middleware");
const authRoutes = require("../owner/auth.route");


module.exports = (app) => {
  const PATH = systemConfig.prefixOwner;

  app.use(PATH, authMiddleware.requireAuth);
  app.use(PATH, (req, res, next) => {
    if (res.locals.user.role !== "OWNER") {
      return res.redirect("/");
    }
    next();
  });

  app.use(PATH, localsOwner);

  app.get(PATH, (req, res) => {
    res.redirect(PATH + "/dashboard");
  });

  app.use(PATH + "/dashboard", dashboardRoutes);
  app.use(PATH + "/facilities", facilityRoutes);
  app.use(PATH + "/bookings", bookingRoutes);
  app.use(PATH + "/finance", financeRoutes);
  app.use(PATH + "/profile", ownerProfileRoutes);
  app.use(PATH + "/refreshments", refreshmentRoutes);
  app.use("/auth", authRoutes);

  // Giữ tương thích link cũ của chủ sân (không đụng /admin/dashboard của platform)
  app.get("/admin/facilities", (req, res) =>
    res.redirect(PATH + "/facilities"),
  );
  app.get("/admin/bookings", (req, res) => res.redirect(PATH + "/bookings"));
  app.get("/admin/finance", (req, res) => res.redirect(PATH + "/finance"));
};
