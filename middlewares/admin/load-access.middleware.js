const { accessOf, can } = require("../../services/admin/rbac.service");
const { visibleMenu } = require("../../services/admin/catalog");

module.exports = async (req, res, next) => {
  const access = await accessOf(req.user._id);
  req.access = access;
  const allowed = (code) => can(access.permissions, code);
  res.locals.can = allowed;
  res.locals.accessRole = access.role;
  res.locals.adminMenu = visibleMenu(allowed);
  return next();
};
