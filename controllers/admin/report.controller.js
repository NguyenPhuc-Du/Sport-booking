const boBatLoi = require("../../helpers/boBatLoi");
const commission = require("../../services/admin/commission.service");

/**
 * Các thẻ số cộng từ dòng báo cáo hoa hồng.
 * @param {object[]} rows Dòng do commission.page trả về.
 * @returns {object[]}
 */
function theSo(rows, tong) {
  return [
    { nhan: "Số chủ sân", giaTri: String(rows.length) },
    { nhan: "Hoa hồng", giaTri: tong.feeLabel },
    { nhan: "Đã thu", giaTri: tong.collectedLabel },
    { nhan: "Còn mở", giaTri: tong.openLabel },
  ];
}

/**
 * Vẽ bảng hoa hồng dùng chung cho danh sách và báo cáo.
 * @param {object} res Response.
 * @param {object} data Kết quả commission.page.
 * @param {string} title Tiêu đề.
 * @param {string} path Đường dẫn form lọc.
 * @param {boolean} exportCsv Có nút xuất CSV hay không.
 */
function renderBang(res, data, title, path, exportCsv) {
  const tong = commission.tongHop(data.rows);
  const query = `from=${encodeURIComponent(data.period.fromInput)}&to=${encodeURIComponent(data.period.toInput)}`;
  res.render("admin/pages/platform/commission-rows", {
    pageTitle: title,
    title,
    basePath: path,
    rows: data.rows,
    stats: theSo(data.rows, tong),
    period: data.period,
    cycles: data.cycles,
    tong,
    csvHref: exportCsv ? `${path}?format=csv&${query}` : "",
  });
}

const lines = boBatLoi(async (req, res) => {
  const data = await commission.page(req.query);
  renderBang(res, data, "Danh sách hoa hồng", "/admin/commissions/lines", false);
});

const reconcile = boBatLoi(async (req, res) => {
  const data = await commission.page(req.query);
  res.render("admin/pages/platform/commissions", {
    pageTitle: "Đối soát",
    activeMenu: "reconcile",
    ...data,
  });
});

const report = boBatLoi(async (req, res) => {
  const data = await commission.page(req.query);
  if (req.query.format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=bao-cao-hoa-hong.csv");
    return res.send(commission.csv(data.rows));
  }
  return renderBang(res, data, "Báo cáo hoa hồng", "/admin/reports", true);
});

module.exports = { lines, reconcile, report };
