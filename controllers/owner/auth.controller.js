const authService = require("../../services/owner/auth.service");

module.exports.login = async (req, res) => {
  res.render("owner/pages/auth/login", {
    pageTitle: "Đăng nhập",
  });
};

module.exports.loginPost = async (req, res) => {
  const { user, accessToken } = await authService.login(req.body.email);

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
  });

  if (user.role == "OWNER") {
    return res.redirect("/owner/dashboard");
  }

  return res.redirect("/");
};

module.exports.logout = (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  req.flash("success", "Đăng xuất thành công");
  return res.redirect("/auth/login");
};

module.exports.register = (req, res) => {
  res.render("client/pages/auth/register", {
    pageTitle: "Đăng kí",
  });
};

module.exports.registerPost = async (req, res) => {
  try {
    await authService.register(req.body);

    req.flash("success", "Đăng kí thành công");
    return res.redirect("/auth/login");
  } catch (error) {
    req.flash("error", "Đăng kí thất bại");
    return res.redirect("/auth/register");
  }
};
