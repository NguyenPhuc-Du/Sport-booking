const systemConfig = require("../../config/system");

function resolveActiveMenu(path) {
  if (path.startsWith("/facilities")) return "facilities";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/bookings")) return "bookings";
  if (path.startsWith("/drinks")) return "drinks";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/dashboard") || path === "/" || path === "") {
    return "dashboard";
  }
  return "";
}

module.exports = (req, res, next) => {
  res.locals.prefixOwner = systemConfig.prefixOwner;
  res.locals.prefixAdmin = systemConfig.prefixOwner; // tương thích view cũ
  res.locals.panelRole = "owner";
  res.locals.panelHome = systemConfig.prefixOwner + "/dashboard";
  res.locals.activeMenu = resolveActiveMenu(req.path || "");
  next();
};
