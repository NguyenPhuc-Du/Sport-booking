function quay(req, res, message) {
  req.flash("error", message);
  const loai = req.params.loai || "owners";
  return res.redirect(req.get("Referrer") || `/admin/accounts/${loai}`);
}

/**
 * Kiểm tra form thêm chủ sân hoặc khách.
 * @param {object} req Request.
 * @param {object} res Response.
 * @param {Function} next Đi tiếp khi hợp lệ.
 */
function tao(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  if (!fullName || !email || !phone) return quay(req, res, "Nhập đủ họ tên, email và số điện thoại");
  if (String(req.body.password || "").length < 8) return quay(req, res, "Mật khẩu tối thiểu 8 ký tự");
  return next();
}

/**
 * Kiểm tra form sửa tên, email, số điện thoại.
 * @param {object} req Request.
 * @param {object} res Response.
 * @param {Function} next Đi tiếp khi hợp lệ.
 */
function sua(req, res, next) {
  if (!String(req.body.fullName || "").trim() || !String(req.body.email || "").trim()) {
    return quay(req, res, "Nhập đủ họ tên và email");
  }
  return next();
}

/**
 * Kiểm tra mật khẩu mới và ô nhập lại.
 * @param {object} req Request.
 * @param {object} res Response.
 * @param {Function} next Đi tiếp khi khớp.
 */
function matKhau(req, res, next) {
  const password = String(req.body.password || "");
  if (password.length < 8) return quay(req, res, "Mật khẩu mới tối thiểu 8 ký tự");
  if (password !== String(req.body.confirm || "")) return quay(req, res, "Mật khẩu nhập lại chưa khớp");
  return next();
}

module.exports = { tao, sua, matKhau };
