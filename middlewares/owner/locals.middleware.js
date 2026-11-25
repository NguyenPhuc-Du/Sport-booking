const systemConfig = require("../../config/system");
const facilityService = require("../../services/owner/facility.service");

function resolveActiveMenu(path) {
  if (path.startsWith("/facilities")) return "facilities";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/bookings/list")) return "booking-list";
  if (path.startsWith("/bookings")) return "bookings";
  if (path.startsWith("/drinks")) return "drinks";
  if (path.startsWith("/reviews")) return "reviews";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/dashboard/reports")) return "reports";
  if (path.startsWith("/dashboard") || path === "/" || path === "") {
    return "dashboard";
  }
  return "";
}

module.exports = async (req, res, next) => {
  res.locals.prefixOwner = systemConfig.prefixOwner;
  // Giữ alias để view cũ dùng prefixAdmin không gãy link
  res.locals.prefixAdmin = systemConfig.prefixOwner;
  res.locals.panelRole = "owner";
  res.locals.panelHome = systemConfig.prefixOwner + "/dashboard";
  res.locals.activeMenu = resolveActiveMenu(req.path || "");
  res.locals.sidebarVenueName = "Cơ sở của bạn";

  try {
    const ownerId = res.locals.user && res.locals.user.id;
    if (ownerId) {
      const venues = await facilityService.getAllVenueByOwnerId(ownerId);
      if (venues && venues.length) {
        res.locals.sidebarVenueName =
          venues.length === 1
            ? venues[0].name
            : `${venues[0].name} (+${venues.length - 1})`;
      }
    }
  } catch (error) {
    // giữ fallback
  }
  next();
};
