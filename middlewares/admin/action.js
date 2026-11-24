const asyncHandler = require("./async-handler");
const { ServiceError } = require("../../services/admin/auth.service");

function errorText(error) {
  return error instanceof ServiceError ? error.message : "Thao tác thất bại";
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
