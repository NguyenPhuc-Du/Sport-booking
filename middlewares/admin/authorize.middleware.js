function authorize(permission) {
  return (req, res, next) => {
    const allowed = req.access && req.access.permissions.includes(permission);
    if (allowed) return next();
    if (req.accepts("html")) {
      return res.status(403).render("admin/pages/platform/forbidden", {
        pageTitle: "Không có quyền",
        activeMenu: "",
      });
    }
    return res
      .status(403)
      .json({ message: "Bạn không có quyền thực hiện thao tác này" });
  };
}

module.exports = authorize;
