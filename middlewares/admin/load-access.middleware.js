const { accessOf, can } = require("../../services/admin/rbac.service");
const { layMenuChoUser } = require("../../services/admin/menu.service");

module.exports = async (req, res, next) => {
  try {
    const access = await accessOf(req.user._id);
    req.access = access;
    const allowed = (code) => can(access.permissions, code);
    res.locals.can = allowed;
    res.locals.accessRole = access.role;
    res.locals.menu = await layMenuChoUser(access.permissions);
    res.locals.currentPath = req.path;
    return next();
  } catch (error) {
    return next(error);
  }
};
