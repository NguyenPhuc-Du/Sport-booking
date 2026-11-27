/**
 * Giữ đường dẫn cũ sau khi gộp menu.
 * Danh sách hoa hồng và đối soát nằm ở /admin/commissions.
 * Báo cáo là xuất file từ trang thống kê.
 */

/**
 * /admin/commissions/lines
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const lines = (req, res) => res.redirect("/admin/commissions");

/**
 * /admin/reconciliation
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const reconcile = (req, res) => res.redirect("/admin/commissions?tab=doi-soat");

/**
 * /admin/reports
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const report = (req, res) => res.redirect("/admin/thong-ke");

module.exports = { lines, reconcile, report };
