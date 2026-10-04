const systemConfig = require("../../config/system");

module.exports = (req, res, next) => {
  res.locals.prefixAdmin = systemConfig.prefixAdmin;
  next();
};
