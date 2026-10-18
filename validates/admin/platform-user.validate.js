const mongoose = require("mongoose");

function assignRole(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.roleId)) {
    req.flash("error", "Chọn một vai trò hợp lệ");
    return res.redirect("/admin/users");
  }
  return next();
}

function changeStatus(req, res, next) {
  if (!["active", "inactive"].includes(req.body.status)) {
    req.flash("error", "Trạng thái không hợp lệ");
    return res.redirect("/admin/users");
  }
  return next();
}

module.exports = { assignRole, changeStatus };
