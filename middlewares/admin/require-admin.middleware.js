module.exports = (req, res, next) => {
  const permissions = req.access && req.access.permissions;
  if (permissions && permissions.length) return next();
  return res.status(403).render("admin/pages/platform/forbidden", {
    pageTitle: "Không có quyền",
    activeMenu: "",
  });
};
