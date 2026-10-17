const authRoutes = require("./auth.route");
const homeRoutes = require("./home.route");
const facilityRoutes = require("./facility.route");
const checkoutRoutes = require("./checkout.route");
const profileRoutes = require("./profile.route");

module.exports = (app) => {
  app.use("/", homeRoutes);
  app.use("/facilities", facilityRoutes);
  app.use("/checkout", checkoutRoutes);
  app.use("/profile", profileRoutes);
  app.use("/auth", authRoutes);
};
