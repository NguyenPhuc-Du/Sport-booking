const asyncHandler = require("./async-handler");
const { ServiceError } = require("../../services/admin/auth.service");

function errorText(error) {
  if (error instanceof ServiceError) return error.message;
  if (error && error.name === "ValidationError") {
    return "Dữ liệu không khớp cấu trúc tài khoản, chưa được ghi";
  }
  return "Thao tác thất bại";
}

function destination(req, where, result) {
  if (typeof where === "function") return where(req, result);
  return where || req.get("Referrer") || "/admin/users";
}

function action(work, options) {
  const opts = options || {};
  return asyncHandler(async (req, res) => {
    try {
      const result = await work(req);
      const success =
        typeof opts.success === "function" ? opts.success(req, result) : opts.success;
      if (success) req.flash("success", success);
      return res.redirect(destination(req, opts.to, result));
    } catch (error) {
      req.flash("error", errorText(error));
      return res.redirect(destination(req, opts.failTo || opts.to));
    }
  });
}

module.exports = { action };
