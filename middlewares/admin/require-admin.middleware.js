module.exports = (req, res, next) => {
  const permissions = req.access && req.access.permissions;
  if (permissions && permissions.length) return next();
  return res.status(403).render("admin/pages/errors/403", {
    pageTitle: "Không có quyền",
  });
};
