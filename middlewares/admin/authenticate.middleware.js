const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const { nho } = require("../../services/admin/bo-nho");

const COOKIE = "admin_access_token";

function clear(res) {
  res.clearCookie(COOKIE, { path: "/admin" });
}

function send401(req, res) {
  if (req.accepts("html")) {
    return res.status(401).render("admin/pages/auth/unauthorized", {
      pageTitle: "Cần đăng nhập",
    });
  }
  return res.status(401).json({ message: "Bạn cần đăng nhập" });
}

module.exports = async (req, res, next) => {
  const token = req.cookies[COOKIE];
  if (!token || typeof token !== "string") return send401(req, res);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await nho(`user:${decoded.id}:${decoded.tv || 0}`, 60000, () =>
      User.findById(decoded.id).select("-password_hash").lean(),
    );
    const version = Number(user && user.token_version) || 0;
    const tokenVersion = Number(decoded.tv) || 0;
    if (!user || user.status !== "active" || tokenVersion !== version) {
      clear(res);
      return send401(req, res);
    }
    req.user = user;
    res.locals.user = user;
    return next();
  } catch (error) {
    clear(res);
    return send401(req, res);
  }
};
