const mongoose = require("mongoose");

function adjust(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
    req.flash("error", "Chọn tài khoản");
    return res.redirect("/admin/ledger");
  }
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    req.flash("error", "Số tiền điều chỉnh phải khác 0");
    return res.redirect("/admin/ledger");
  }
  if (!String(req.body.note || "").trim()) {
    req.flash("error", "Nhập lý do điều chỉnh");
    return res.redirect("/admin/ledger");
  }
  return next();
}

module.exports = { adjust };
