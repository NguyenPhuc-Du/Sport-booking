const boBatLoi = require("../../helpers/boBatLoi");
const payment = require("../../services/admin/payment.service");

const index = boBatLoi(async (req, res) => {
  const data = await payment.danhSach({
    q: req.query.q,
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });
  res.render("admin/pages/platform/payments", {
    pageTitle: "Giao dịch thanh toán",
    ...data,
  });
});

module.exports = { index };
