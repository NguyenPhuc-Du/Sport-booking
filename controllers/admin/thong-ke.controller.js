const boBatLoi = require("../../helpers/boBatLoi");
const thongKe = require("../../services/admin/thong-ke.service");

/**
 * Trang thống kê. Không gọi MongoDB cho đến khi bấm Xem hoặc xuất file.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const index = boBatLoi(async (req, res) => {
  const khung = thongKe.chonKy(req.query);
  const nhom = thongKe.nhomCua(req.query);
  const daXem = req.query.xem === "1" || Boolean(req.query.dang) || Boolean(req.query.bang);
  if (!daXem) {
    return res.render("admin/pages/platform/thong-ke", {
      pageTitle: "Thống kê kinh doanh",
      daXem: false,
      nhom,
      ...khung,
    });
  }
  const data = await thongKe.baoCao(req.query, req.query.lamMoi === "1");
  data.nguoi = req.user && req.user.fullName ? req.user.fullName : "Quản trị";
  if (req.query.dang === "excel") return thongKe.xuatExcel(res, data);
  if (req.query.dang === "pdf") return thongKe.xuatPdf(res, data);
  res.render("admin/pages/platform/thong-ke", {
    pageTitle: "Thống kê kinh doanh",
    daXem: true,
    ...data,
  });
});

module.exports = { index };
