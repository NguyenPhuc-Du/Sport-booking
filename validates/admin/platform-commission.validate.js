const mongoose = require("mongoose");
const { CYCLE_CODES } = require("../../services/admin/catalog");

function save(req, res, next) {
  const percent = Number(req.body.ratePercent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    req.flash("error", "Tỷ lệ hoa hồng từ 0 đến 100");
    return res.redirect("/admin/commissions?tab=config");
  }
  if (!CYCLE_CODES.includes(req.body.cycle)) {
    req.flash("error", "Chu kỳ không hợp lệ");
    return res.redirect("/admin/commissions?tab=config");
  }
  return next();
}

function ownerRate(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
    req.flash("error", "Chọn chủ sân");
    return res.redirect("/admin/commissions?tab=config");
  }
  return next();
}

function close(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.ownerId)) {
    req.flash("error", "Chọn chủ sân");
    return res.redirect("/admin/commissions");
  }
  if (!req.body.from || !req.body.to) {
    req.flash("error", "Chọn kỳ đối soát");
    return res.redirect("/admin/commissions");
  }
  return next();
}

module.exports = { save, ownerRate, close };
