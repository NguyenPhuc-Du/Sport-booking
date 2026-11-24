const asyncHandler = require("../../middlewares/admin/async-handler");
const { action } = require("../../middlewares/admin/action");
const userService = require("../../services/admin/user.service");
const roleService = require("../../services/admin/role.service");
const audit = require("../../services/admin/audit.service");
const { ServiceError } = require("../../services/admin/auth.service");
const { STATUSES } = require("../../services/admin/catalog");

function activeMenu(role) {
  if (role === "OWNER") return "users-owner";
  if (role === "USER") return "users-user";
  return "users";
}

const index = asyncHandler(async (req, res) => {
  const tab = req.query.tab === "audit" ? "audit" : "users";
  const data =
    tab === "audit"
      ? { users: [], page: 1, pages: 1, total: 0, q: "", status: "", role: "", audits: await audit.list() }
      : { ...(await userService.list(req.query)), audits: [] };

  res.render("admin/pages/platform/users", {
    pageTitle: "Quản lý Người dùng & Tài khoản",
    activeMenu: activeMenu(req.query.role),
    tab,
    roles: await roleService.choices(),
    assignableRoles: await userService.rolesActorMayAssign(req.user._id),
    statuses: STATUSES,
    ...data,
  });
});

const detail = asyncHandler(async (req, res) => {
  try {
    const data = await userService.detail(req.params.id);
    return res.render("admin/pages/platform/user-detail", {
      pageTitle: data.user.fullName,
      activeMenu: "users",
      roles: await roleService.choices(),
      ...data,
    });
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Thao tác thất bại";
    req.flash("error", message);
    return res.redirect("/admin/users");
  }
});

const create = action((req) => userService.create(req.user._id, req.body, { ip: req.ip }), {
  success: "Đã tạo tài khoản",
  to: "/admin/users",
});

const update = action(
  (req) => userService.updateProfile(req.user._id, req.params.id, req.body, { ip: req.ip }),
  { success: "Đã cập nhật thông tin" },
);

const resetPassword = action(
  (req) => userService.resetPassword(req.user._id, req.params.id, req.body.password, { ip: req.ip }),
  { success: "Đã đặt lại mật khẩu" },
);

const assignRole = action(
  (req) => {
    if (req.body.confirm !== "yes") throw new ServiceError("Xác nhận trước khi đổi vai trò");
    return userService.changeRole(req.user._id, req.params.id, req.body.role, {
      reason: req.body.reason,
      ip: req.ip,
    });
  },
  { success: "Đã đổi vai trò" },
);

const changeStatus = action(
  (req) => userService.changeStatus(req.user._id, req.params.id, req.body.status, { ip: req.ip }),
  {
    success: (req) => (req.body.status === "inactive" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản"),
  },
);

module.exports = { index, detail, create, update, resetPassword, assignRole, changeStatus };
