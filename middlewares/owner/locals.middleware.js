const systemConfig = require("../../config/system");

module.exports = (req, res, next) => {
  res.locals.prefixOwner = systemConfig.prefixOwner;
  res.locals.prefixAdmin = systemConfig.prefixOwner; // tương thích view cũ
  res.locals.panelRole = "owner";
  res.locals.panelHome = systemConfig.prefixOwner + "/dashboard";
  next();
};
