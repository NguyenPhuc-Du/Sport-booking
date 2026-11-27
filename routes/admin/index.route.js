const systemConfig = require("../../config/system");
const localsAdmin = require("../../middlewares/admin/locals.middleware");
const authenticate = require("../../middlewares/admin/authenticate.middleware");
const loadAccess = require("../../middlewares/admin/load-access.middleware");
const requireConsole = require("../../middlewares/admin/require-admin.middleware");

const authRoutes = require("./auth.route");
const dashboardRoutes = require("./platform-dashboard.route");
const userRoutes = require("./user.route");
const commissionRoutes = require("./commission.route");
const roleRoutes = require("./role.route");
const accountRoutes = require("./account.route");
const paymentRoutes = require("./payment.route");
const reportRoutes = require("./report.route");
const thongKeRoutes = require("./thong-ke.route");
const { kiemTraCsrf } = require("../../middlewares/admin/csrf.middleware");
const doThoiGian = require("../../middlewares/admin/timing.middleware");

module.exports = (app) => {
  const PATH = systemConfig.prefixAdmin;

  app.use(PATH, doThoiGian, localsAdmin);
  app.use(PATH + "/auth", kiemTraCsrf, authRoutes);
  app.use(PATH, authenticate, loadAccess, requireConsole, kiemTraCsrf);

  app.get(PATH, (req, res) => {
    const groups = res.locals.menu || [];
    const first = groups.flatMap((group) => (group.path ? [group] : group.children || []))[0];
    if (!first) {
      return res.status(403).render("admin/pages/errors/403", {
        pageTitle: "Không có quyền",
      });
    }
    return res.redirect(first.path);
  });

  app.use(PATH + "/dashboard", dashboardRoutes);
  app.use(PATH + "/users", userRoutes);
  app.use(PATH + "/roles", roleRoutes);
  app.use(PATH + "/commissions", commissionRoutes);
  app.use(PATH + "/accounts", accountRoutes);
  app.use(PATH + "/payments", paymentRoutes);
  app.use(PATH + "/reconciliation", reportRoutes.reconcile);
  app.use(PATH + "/reports", reportRoutes.reports);
  app.use(PATH + "/thong-ke", thongKeRoutes);
  app.use(PATH + "/admins", accountRoutes.admins);
  app.use(PATH + "/profile", accountRoutes.profile);

  app.use(PATH, (req, res) => {
    res.status(404).render("admin/pages/errors/404", { pageTitle: "Không tìm thấy" });
  });

  app.use((error, req, res, next) => {
    if (!req.path || !req.path.startsWith(PATH)) return next(error);
    console.error(error);
    if (res.headersSent) return next(error);
    res.status(500).render("admin/pages/errors/500", { pageTitle: "Lỗi hệ thống" });
  });
};
