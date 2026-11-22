const asyncHandler = require("../../middlewares/admin/async-handler");
const { action } = require("../../middlewares/admin/action");
const roleService = require("../../services/admin/role.service");
const { ServiceError } = require("../../services/admin/auth.service");

const index = asyncHandler(async (req, res) => {
  res.render("admin/pages/platform/roles", {
    pageTitle: "Vai trò & Phân quyền",
    activeMenu: "roles",
    roles: await roleService.list(),
  });
});

const edit = asyncHandler(async (req, res) => {
  try {
    const data = await roleService.matrix(req.params.id);
    return res.render("admin/pages/platform/role-form", {
      pageTitle: data.role.name,
      activeMenu: "roles",
      otherRoles: await roleService.choices(),
      ...data,
    });
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Thao tác thất bại";
    req.flash("error", message);
    return res.redirect("/admin/roles");
  }
});

const create = action((req) => roleService.create(req.user._id, req.body, req.ip), {
  success: "Đã tạo vai trò",
  to: (req, role) => `/admin/roles/${role._id}`,
  failTo: "/admin/roles",
});

const update = action((req) => roleService.update(req.user._id, req.params.id, req.body, req.ip), {
  success: "Đã lưu vai trò",
  to: (req) => `/admin/roles/${req.params.id}`,
});

const savePermissions = action(
  (req) => roleService.savePermissions(req.user._id, req.params.id, req.body.permissions, req.ip),
  {
    success: "Đã lưu quyền",
    to: (req) => `/admin/roles/${req.params.id}`,
  },
);

const remove = action(
  (req) => roleService.remove(req.user._id, req.params.id, req.body.transfer_role_id, req.ip),
  {
    success: "Đã xóa vai trò",
    to: "/admin/roles",
    failTo: (req) => req.get("Referrer") || "/admin/roles",
  },
);

module.exports = { index, create, edit, update, savePermissions, remove };
