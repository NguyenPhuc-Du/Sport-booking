const systemConfig = require("../../config/system");
const localsAdmin = require("../../middlewares/admin/locals.middleware");
const authenticate = require("../../middlewares/admin/authenticate.middleware");
const loadAccess = require("../../middlewares/admin/load-access.middleware");
const requireConsole = require("../../middlewares/admin/require-admin.middleware");

const authRoutes = require("./auth.route");
const dashboardRoutes = require("./platform-dashboard.route");
const userRoutes = require("./user.route");
const commissionRoutes = require("./commission.route");
const ledgerRoutes = require("./ledger.route");
const roleRoutes = require("./role.route");
const auditRoutes = require("./audit.route");

module.exports = (app) => {
  const PATH = systemConfig.prefixAdmin;

  app.use(PATH, localsAdmin);
  app.use(PATH + "/auth", authRoutes);
  app.use(PATH, authenticate, loadAccess, requireConsole);

  app.get(PATH, (req, res) => {
    const groups = res.locals.adminMenu || [];
    const first = groups.flatMap((group) => group.items)[0];
    if (!first) {
      return res.status(403).render("admin/pages/platform/forbidden", {
        pageTitle: "Không có quyền",
        activeMenu: "",
      });
    }
    return res.redirect(first.href);
  });

  app.use(PATH + "/dashboard", dashboardRoutes);
  app.use(PATH + "/users", userRoutes);
  app.use(PATH + "/roles", roleRoutes);
  app.use(PATH + "/audit", auditRoutes);
  app.use(PATH + "/commissions", commissionRoutes);
  app.use(PATH + "/ledger", ledgerRoutes);
};
