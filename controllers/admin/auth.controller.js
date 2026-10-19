const asyncHandler = require("../../middlewares/admin/async-handler");
const {
  login: loginService,
  ServiceError,
} = require("../../services/admin/auth.service");

const COOKIE = "admin_access_token";

function cookieOptions(remember) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000,
  };
}

const loginForm = asyncHandler(async (req, res) => {
  res.render("admin/pages/auth/login", { pageTitle: "Đăng nhập quản trị" });
});

const login = asyncHandler(async (req, res) => {
  try {
    const result = await loginService({
      email: req.body.email,
      password: req.body.password,
    });
    res.cookie(
      COOKIE,
      result.accessToken,
      cookieOptions(req.body.remember === "on"),
    );
    return res.redirect("/admin/dashboard");
  } catch (error) {
    const message =
      error instanceof ServiceError ? error.message : "Đăng nhập thất bại";
    req.flash("error", message);
    return res.redirect("/admin/auth/login");
  }
});

const logout = asyncHandler(async (req, res) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
  };
  res.clearCookie(COOKIE, options);
  res.clearCookie(COOKIE, { ...options, path: "/" });
  return res.redirect("/admin/auth/login");
});

module.exports = { loginForm, login, logout };
