const asyncHandler = require("../../middlewares/admin/async-handler");
const statsService = require("../../services/admin/stats.service");

const index = asyncHandler(async (req, res) => {
  try {
    const stats = await statsService.getOverview();
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      stats,
      loadError: null,
    });
  } catch (error) {
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      stats: null,
      loadError: "Không đọc được số liệu. Kiểm tra kết nối MongoDB.",
    });
  }
});

module.exports = { index };
