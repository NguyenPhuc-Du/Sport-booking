module.exports = (req, res, next) => {
  if (req.user.role === "ADMIN") return next();
  res.clearCookie("admin_access_token", { path: "/admin" });
  req.flash("error", "Khu vực này dành cho quản trị hệ thống");
  return res.redirect("/admin/auth/login");
};
