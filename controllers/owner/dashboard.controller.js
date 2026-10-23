const dashboardService = require("../../services/owner/dashboard.service");

module.exports.index = async (req, res) => {
  const data = await dashboardService.getOverview(res.locals.user.id, req.query.range);

  res.render("owner/pages/dashboard/index", {
    pageTitle: "Tổng quan & Thống kê",
    ...data,
  });
};
