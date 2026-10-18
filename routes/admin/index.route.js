const systemConfig = require("../../config/system");
const localsAdmin = require("../../middlewares/admin/locals.middleware");
const authenticate = require("../../middlewares/admin/authenticate.middleware");
const requireAdmin = require("../../middlewares/admin/require-admin.middleware");

const platformDashboardRoutes = require("./platform-dashboard.route");
const platformPermissionsRoutes = require("./platform-permissions.route");
const authRoutes = require("./auth.route");

module.exports = (app) => {
  const PATH_ADMIN = systemConfig.prefixAdmin;

  app.use(PATH_ADMIN, localsAdmin);
  app.use(PATH_ADMIN + "/auth", authRoutes);

  app.use(PATH_ADMIN, authenticate);
  app.use(PATH_ADMIN, requireAdmin);

  app.get(PATH_ADMIN, (req, res) => {
    res.redirect(PATH_ADMIN + "/dashboard");
  });

  app.use(PATH_ADMIN + "/dashboard", platformDashboardRoutes);
  app.use(PATH_ADMIN + "/permissions", platformPermissionsRoutes);
  app.use(PATH_ADMIN + "/users", platformPermissionsRoutes);
};
