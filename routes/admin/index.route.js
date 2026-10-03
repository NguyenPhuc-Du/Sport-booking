const systemConfig = require("../../config/system");
const localsAdmin = require("../../middlewares/admin/locals.middleware");

const dashboardRoutes = require("./dashboard.route");
const facilityRoutes = require("./facility.route");
const bookingRoutes = require("./booking.route");
const financeRoutes = require("./finance.route");
const userRoutes = require("./user.route");
const accountRoutes = require("./account.route");
const voucherRoutes = require("./voucher.route");
module.exports = (app) => {
  const PATH_ADMIN = systemConfig.prefixAdmin;

  app.use(PATH_ADMIN + "/accounts", accountRoutes);
  app.use(PATH_ADMIN + "/vouchers", voucherRoutes);
  module.exports = (app) => {
    const PATH_ADMIN = systemConfig.prefixAdmin;

    app.use(PATH_ADMIN, localsAdmin);

    app.get(PATH_ADMIN, (req, res) => {
      res.redirect(PATH_ADMIN + "/dashboard");
    });

    app.use(PATH_ADMIN + "/dashboard", dashboardRoutes);
    app.use(PATH_ADMIN + "/facilities", facilityRoutes);
    app.use(PATH_ADMIN + "/bookings", bookingRoutes);
    app.use(PATH_ADMIN + "/finance", financeRoutes);
    app.use(PATH_ADMIN + "/users", userRoutes);
    app.use(PATH_ADMIN + "/accounts", accountRoutes);
  };
};
