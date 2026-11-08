const { ROLE_CODES, STATUS_CODES } = require("../../services/admin/catalog");

function back(req, res, message) {
  req.flash("error", message);
  return res.redirect("/admin/users");
}

function assignRole(req, res, next) {
  if (!ROLE_CODES.includes(req.body.role))
    return back(req, res, "Chọn một vai trò hợp lệ");
  return next();
}

function changeStatus(req, res, next) {
  if (!STATUS_CODES.includes(req.body.status))
    return back(req, res, "Trạng thái không hợp lệ");
  return next();
}

function create(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  if (!fullName || !email || !phone) {
    return back(req, res, "Nhập đủ họ tên, email và số điện thoại");
  }
  if (!ROLE_CODES.includes(req.body.role))
    return back(req, res, "Chọn một vai trò hợp lệ");
  if (password.length < 6) return back(req, res, "Mật khẩu tối thiểu 6 ký tự");
  return next();
}

function update(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  if (!fullName || !email || !phone) {
    return back(req, res, "Nhập đủ họ tên, email và số điện thoại");
  }
  return next();
}

function resetPassword(req, res, next) {
  if (String(req.body.password || "").length < 6) {
    return back(req, res, "Mật khẩu tối thiểu 6 ký tự");
  }
  return next();
}

module.exports = { assignRole, changeStatus, create, update, resetPassword };
