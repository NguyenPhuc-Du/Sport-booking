function login(req, res, next) {
  const email = (req.body.email || "").trim();
  const password = req.body.password || "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    req.flash("error", "Email không đúng định dạng");
    return res.redirect("/admin/auth/login");
  }

  if (password.length < 6) {
    req.flash("error", "Mật khẩu tối thiểu 6 ký tự");
    return res.redirect("/admin/auth/login");
  }

  req.body.email = email;
  return next();
}

module.exports = { login };
