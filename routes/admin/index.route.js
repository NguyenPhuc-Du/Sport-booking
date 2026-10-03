const systemConfig = require("../../config/system");

const accountRoutes = require("./account.route");
const voucherRoutes = require("./voucher.route");
module.exports = (app) => {
  const PATH_ADMIN = systemConfig.prefixAdmin;

  app.use(PATH_ADMIN + "/accounts", accountRoutes);
  app.use(PATH_ADMIN + "/vouchers", voucherRoutes);
};
