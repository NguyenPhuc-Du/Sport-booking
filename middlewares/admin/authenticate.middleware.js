const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const { roleCodesOf } = require("../../services/admin/auth.service");

const COOKIE = "admin_access_token";
const LOGIN = "/admin/auth/login";

function clear(res) {
  res.clearCookie(COOKIE, { path: "/admin" });
}

module.exports = async (req, res, next) => {
  const token = req.cookies[COOKIE];
  if (!token || typeof token !== "string") return res.redirect(LOGIN);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select("-password_hash")
      .lean();
    if (!user || user.status !== "active") {
      clear(res);
      return res.redirect(LOGIN);
    }
    user.roleCodes = await roleCodesOf(user._id);
    req.user = user;
    res.locals.user = user;
    return next();
  } catch (error) {
    clear(res);
    return res.redirect(LOGIN);
  }
};
