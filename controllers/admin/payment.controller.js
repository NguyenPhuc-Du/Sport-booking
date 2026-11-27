const boBatLoi = require("../../helpers/boBatLoi");
const payment = require("../../services/admin/payment.service");

const index = boBatLoi(async (req, res) => {
  const data = await payment.danhSach({
    q: req.query.q,
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    pageSize: req.query.pageSize,
    t1: req.query.t1,
    o1: req.query.o1,
    v1: req.query.v1,
    t2: req.query.t2,
    o2: req.query.o2,
    v2: req.query.v2,
    l2: req.query.l2,
  });
  const phu = await payment.mot(req.query.chon);
  res.render("admin/pages/platform/payments", {
    pageTitle: "Giao dịch thanh toán",
    phu,
    chon: String(req.query.chon || ""),
    ...data,
  });
});

module.exports = { index };
