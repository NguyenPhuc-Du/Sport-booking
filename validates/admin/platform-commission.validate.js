const mongoose = require("mongoose");

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

module.exports = { close };
