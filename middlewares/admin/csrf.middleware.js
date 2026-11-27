const crypto = require("crypto");

/**
 * Tạo token CSRF và gắn vào view.
 * @param {object} req Request.
 * @param {object} res Response.
 * @param {Function} next Hàm đi tiếp.
 * Gọi cho mọi request vào /admin.
 */
function ganCsrf(req, res, next) {
  let token = req.cookies && req.cookies.admin_csrf;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    res.cookie("admin_csrf", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/admin",
    });
  }
  res.locals.csrfToken = token;
  next();
}

/**
 * Chặn POST admin nếu token không khớp cookie.
 * @param {object} req Request.
 * @param {object} res Response.
 * @param {Function} next Hàm đi tiếp.
 * Gọi trước các route ghi dữ liệu.
 */
function kiemTraCsrf(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const cookie = req.cookies && req.cookies.admin_csrf;
  const sent = (req.body && req.body._csrf) || req.query._csrf || req.get("x-csrf-token");
  if (cookie && sent && cookie === sent) return next();
  return res.status(403).render("admin/pages/errors/403", {
    pageTitle: "Không có quyền",
  });
}

module.exports = { ganCsrf, kiemTraCsrf };
