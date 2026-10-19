const systemConfig = require("../../config/system");
const localsAdmin = require("../../middlewares/admin/locals.middleware");
const authenticate = require("../../middlewares/admin/authenticate.middleware");
const requireAdmin = require("../../middlewares/admin/require-admin.middleware");

const authRoutes = require("./auth.route");
const dashboardRoutes = require("./platform-dashboard.route");
const userRoutes = require("./user.route");
const readonlyRoutes = require("./readonly.route");

module.exports = (app) => {
  const PATH = systemConfig.prefixAdmin;

  app.use(PATH, localsAdmin);
  app.use(PATH + "/auth", authRoutes);
  app.use(PATH, authenticate, requireAdmin);

  app.get(PATH, (req, res) => res.redirect(PATH + "/dashboard"));
  app.use(PATH + "/dashboard", dashboardRoutes);
  app.use(PATH + "/users", userRoutes);
  app.use(PATH, readonlyRoutes);
};
