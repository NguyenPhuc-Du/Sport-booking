const asyncHandler = require("../../middlewares/admin/async-handler");
const ledger = require("../../services/admin/ledger.service");
const { CHART_CODES } = require("../../services/admin/catalog");

const index = asyncHandler(async (req, res) => {
  const range = CHART_CODES.includes(req.query.range) ? req.query.range : "day";
  try {
    const data = await ledger.dashboard(range);
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      ...data,
      loadError: null,
    });
  } catch (error) {
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      cards: [],
      chart: { code: range, totalLabel: "0 ₫", buckets: [] },
      charts: [],
      recent: [],
      loadError: "Không đọc được số liệu. Kiểm tra kết nối MongoDB.",
    });
  }
});

module.exports = { index };
