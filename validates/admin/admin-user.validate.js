/**
 * Kiểm tra form tạo quản trị viên trước khi ghi database.
 * @param {object} req Request, đọc body.
 * @param {object} res Response, dùng để báo lỗi.
 * @param {Function} next Đi tiếp khi dữ liệu hợp lệ.
 */
function create(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  const role = String(req.body.role || "");
  const roles = ["SUPER_ADMIN", "ACCOUNT_ADMIN", "COMMISSION_ADMIN"];
  if (!fullName || !email || !phone) {
    req.flash("error", "Nhập đủ họ tên, email và số điện thoại");
    return res.redirect("/admin/admins");
  }
  if (!roles.includes(role)) {
    req.flash("error", "Chọn một trong ba vai trò hệ thống");
    return res.redirect("/admin/admins");
  }
  if (password.length < 6) {
    req.flash("error", "Mật khẩu tối thiểu 6 ký tự");
    return res.redirect("/admin/admins");
  }
  return next();
}

module.exports = { create };
