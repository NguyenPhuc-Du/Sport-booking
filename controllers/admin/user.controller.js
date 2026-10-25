const asyncHandler = require("../../middlewares/admin/async-handler");
const userService = require("../../services/admin/user.service");
const { ServiceError } = require("../../services/admin/auth.service");

function fail(req, res, error) {
  const message =
    error instanceof ServiceError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect("/admin/users");
}

const index = asyncHandler(async (req, res) => {
  const data = await userService.list(req.query);
  res.render("admin/pages/platform/users", {
    pageTitle: "Tài khoản",
    activeMenu: "users",
    ...data,
  });
});

const assignRole = asyncHandler(async (req, res) => {
  try {
    await userService.changeRole(req.user._id, req.params.id, req.body.role);
    req.flash("success", "Đã gán vai trò");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect(req.get("Referrer") || "/admin/users");
});

// const removeRole = asyncHandler(async (req, res) => {
//   try {
//     await userService.removeRole(
//       req.user._id,
//       req.params.id,
//       req.params.roleId,
//     );
//     req.flash("success", "Đã gỡ vai trò");
//   } catch (error) {
//     return fail(req, res, error);
//   }
//   return res.redirect(req.get("Referrer") || "/admin/users");
// });

const changeStatus = asyncHandler(async (req, res) => {
  try {
    await userService.changeStatus(
      req.user._id,
      req.params.id,
      req.body.status,
    );
    req.flash("success", "Đã cập nhật trạng thái");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect(req.get("Referrer") || "/admin/users");
});

module.exports = { index, assignRole, changeStatus };
