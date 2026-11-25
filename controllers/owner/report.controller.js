const reportService = require("../../services/owner/report.service");

module.exports.index = async (req, res) => {
  try {
    const data = await reportService.buildReport(res.locals.user.id, req.query);
    res.render("owner/pages/dashboard/reports", {
      pageTitle: "Báo cáo & Thống kê",
      ...data,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Không tải được báo cáo");
    res.redirect(`${res.locals.prefixOwner}/dashboard`);
  }
};

module.exports.exportExcel = async (req, res) => {
  try {
    const file = await reportService.exportExcel(res.locals.user.id, {
      ...req.query,
      run: "1",
    });
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.send(file.buffer);
  } catch (error) {
    console.error(error);
    req.flash("error", "Xuất Excel thất bại");
    return res.redirect(`${res.locals.prefixOwner}/dashboard/reports`);
  }
};

module.exports.exportPdf = async (req, res) => {
  try {
    const file = await reportService.exportPdf(res.locals.user.id, {
      ...req.query,
      run: "1",
    });
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.send(file.buffer);
  } catch (error) {
    console.error(error);
    req.flash("error", "Xuất PDF thất bại");
    return res.redirect(`${res.locals.prefixOwner}/dashboard/reports`);
  }
};
