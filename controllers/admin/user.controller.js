const asyncHandler = require("../../middlewares/admin/async-handler");
const userService = require("../../services/admin/user.service");
const audit = require("../../services/admin/audit.service");
const { ServiceError } = require("../../services/admin/auth.service");
const { ROLES, STATUSES } = require("../../services/admin/catalog");

function fail(req, res, error, to) {
  const message =
    error instanceof ServiceError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect(to || req.get("Referrer") || "/admin/users");
}

const index = asyncHandler(async (req, res) => {
  const tab = req.query.tab === "audit" ? "audit" : "users";
  const data =
    tab === "audit"
      ? {
          users: [],
          page: 1,
          pages: 1,
          total: 0,
          q: "",
          status: "",
          role: "",
          audits: await audit.list(),
        }
      : { ...(await userService.list(req.query)), audits: [] };

  res.render("admin/pages/platform/users", {
    pageTitle: "Quản lý Người dùng & Tài khoản",
    activeMenu: "users",
    tab,
    roles: ROLES,
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
      roles: ROLES,
      ...data,
    });
  } catch (error) {
    return fail(req, res, error, "/admin/users");
  }
});

const create = asyncHandler(async (req, res) => {
  try {
    await userService.create(req.user._id, req.body);
    req.flash("success", "Đã tạo tài khoản");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect("/admin/users");
});

const update = asyncHandler(async (req, res) => {
  try {
    await userService.updateProfile(req.user._id, req.params.id, req.body);
    req.flash("success", "Đã cập nhật thông tin");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect(req.get("Referrer") || "/admin/users");
});

const resetPassword = asyncHandler(async (req, res) => {
  try {
    await userService.resetPassword(
      req.user._id,
      req.params.id,
      req.body.password,
    );
    req.flash("success", "Đã đặt lại mật khẩu");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect(req.get("Referrer") || "/admin/users");
});

const assignRole = asyncHandler(async (req, res) => {
  try {
    await userService.changeRole(req.user._id, req.params.id, req.body.role);
    req.flash("success", "Đã đổi vai trò");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect(req.get("Referrer") || "/admin/users");
});

const changeStatus = asyncHandler(async (req, res) => {
  try {
    await userService.changeStatus(
      req.user._id,
      req.params.id,
      req.body.status,
    );
    req.flash(
      "success",
      req.body.status === "inactive"
        ? "Đã khóa tài khoản"
        : "Đã mở khóa tài khoản",
    );
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect(req.get("Referrer") || "/admin/users");
});

module.exports = {
  index,
  detail,
  create,
  update,
  resetPassword,
  assignRole,
  changeStatus,
};
