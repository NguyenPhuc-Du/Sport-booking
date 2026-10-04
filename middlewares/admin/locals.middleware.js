const systemConfig = require("../../config/system");

module.exports = (req, res, next) => {
  res.locals.prefixAdmin = systemConfig.prefixAdmin;
  res.locals.prefixOwner = systemConfig.prefixOwner;
  res.locals.panelRole = "admin";
  res.locals.panelHome = systemConfig.prefixAdmin + "/dashboard";
  next();
};
