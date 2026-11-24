const systemConfig = require("../../config/system");
const { ADMIN_MENU } = require("../../services/admin/catalog");

module.exports = (req, res, next) => {
  res.locals.prefixAdmin = systemConfig.prefixAdmin;
  res.locals.prefixOwner = systemConfig.prefixOwner;
  res.locals.panelRole = "admin";
  res.locals.panelHome = systemConfig.prefixAdmin + "/dashboard";
  res.locals.adminMenu = ADMIN_MENU;
  next();
};
