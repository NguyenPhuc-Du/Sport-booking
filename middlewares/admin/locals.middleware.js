const systemConfig = require("../../config/system");
const { ganCsrf } = require("./csrf.middleware");
const { nhanVaiTro, nhanTrangThai } = require("../../helpers/nhan-trang-thai");

module.exports = (req, res, next) => {
  res.locals.prefixAdmin = systemConfig.prefixAdmin;
  res.locals.prefixOwner = systemConfig.prefixOwner;
  res.locals.panelRole = "admin";
  res.locals.panelHome = systemConfig.prefixAdmin + "/dashboard";
  res.locals.menu = [];
  res.locals.nhanVaiTro = nhanVaiTro;
  res.locals.nhanTrangThai = nhanTrangThai;
  ganCsrf(req, res, next);
};
