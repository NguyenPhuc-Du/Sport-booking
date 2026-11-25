const boBatLoi = require("../../helpers/boBatLoi");
const userService = require("../../services/admin/user.service");
const accountService = require("../../services/admin/account.service");
const { ServiceError } = require("../../services/admin/auth.service");

function loi(error) {
  return error instanceof ServiceError ? error.message : "Không lưu được. Thử lại.";
}

/**
 * Render danh sách tài khoản theo vai trò cố định.
 * @param {object} req Request.
 * @param {object} res Response.
 * @param {string} role Mã vai trò OWNER hoặc USER.
 * @param {string} title Tiêu đề trang.
 * @param {string} path Đường dẫn để giữ query phân trang.
 */
function danhSach(loai) {
  const meta = accountService.loaiNao(loai);
  const path = `/admin/accounts/${loai}`;
  return boBatLoi(async (req, res) => {
    const [data, stats] = await Promise.all([
      userService.list({ ...req.query, path }, meta.role),
      accountService.thongKe(meta.role),
    ]);
    res.render("admin/pages/platform/accounts", {
      pageTitle: meta.title,
      title: meta.title,
      moTa: `Danh sách ${meta.title.toLowerCase()} trên sàn.`,
      basePath: path,
      loai,
      stats,
      ...data,
    });
  });
}

const owners = danhSach("owners");
const customers = danhSach("customers");

const detail = boBatLoi(async (req, res) => {
  try {
    const data = await accountService.chiTiet(req.params.loai, req.params.id);
    res.render("admin/pages/platform/account-detail", {
      pageTitle: data.user.fullName,
      loai: req.params.loai,
      ...data,
    });
  } catch (error) {
    req.flash("error", loi(error));
    res.redirect(`/admin/accounts/${req.params.loai}`);
  }
});

const form = boBatLoi(async (req, res) => {
  const meta = accountService.loaiNao(req.params.loai);
  const editing = Boolean(req.params.id);
  const user = editing ? (await accountService.chiTiet(req.params.loai, req.params.id)).user : null;
  res.render("admin/pages/platform/account-form", {
    pageTitle: editing ? "Sửa tài khoản" : `Thêm ${meta.title.toLowerCase()}`,
    loai: req.params.loai,
    title: meta.title,
    user,
  });
});

const tao = boBatLoi(async (req, res) => {
  const meta = accountService.loaiNao(req.params.loai);
  try {
    await userService.create(req.user._id, { ...req.body, role: meta.role }, { ip: req.ip });
    req.flash("success", `Đã thêm ${meta.title.toLowerCase()}`);
  } catch (error) {
    req.flash("error", loi(error));
    return res.redirect(`/admin/accounts/${req.params.loai}/new`);
  }
  return res.redirect(`/admin/accounts/${req.params.loai}`);
});

const sua = boBatLoi(async (req, res) => {
  try {
    await userService.updateProfile(req.user._id, req.params.id, req.body, { ip: req.ip });
    req.flash("success", "Đã lưu thông tin");
  } catch (error) {
    req.flash("error", loi(error));
  }
  return res.redirect(`/admin/accounts/${req.params.loai}/${req.params.id}`);
});

const matKhau = boBatLoi(async (req, res) => {
  try {
    const data = await accountService.chiTiet(req.params.loai, req.params.id);
    await userService.resetPassword(req.user._id, req.params.id, req.body.password, { ip: req.ip });
    req.flash("success", `Đã đặt lại mật khẩu cho ${data.user.fullName}`);
  } catch (error) {
    req.flash("error", loi(error));
  }
  return res.redirect(`/admin/accounts/${req.params.loai}`);
});

const khoa = boBatLoi(async (req, res) => {
  try {
    await userService.changeStatus(req.user._id, req.params.id, req.body.status, { ip: req.ip });
    req.flash("success", req.body.status === "inactive" ? "Đã khóa tài khoản" : "Đã mở tài khoản");
  } catch (error) {
    req.flash("error", loi(error));
  }
  return res.redirect(`/admin/accounts/${req.params.loai}`);
});

const xoa = boBatLoi(async (req, res) => {
  try {
    req.flash("success", await accountService.xoa(req.user._id, req.params.loai, req.params.id));
  } catch (error) {
    req.flash("error", loi(error));
  }
  return res.redirect(`/admin/accounts/${req.params.loai}`);
});
const admins = boBatLoi(async (req, res) => {
  const data = await userService.listAdmins(req.query);
  const roles = await userService.rolesActorMayAssign(req.user._id);
  res.render("admin/pages/platform/accounts", {
    pageTitle: "Quản lý quản trị viên",
    title: "Quản lý quản trị viên",
    basePath: "/admin/admins",
    showCreate: true,
    consoleRoles: roles.filter((item) =>
      ["SUPER_ADMIN", "ACCOUNT_ADMIN", "COMMISSION_ADMIN"].includes(item.code),
    ),
    ...data,
  });
});

const createAdmin = boBatLoi(async (req, res) => {
  try {
    await userService.create(req.user._id, req.body, { ip: req.ip });
    req.flash("success", "Đã tạo quản trị viên");
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Không tạo được quản trị viên";
    req.flash("error", message);
  }
  return res.redirect("/admin/admins");
});

const profile = boBatLoi(async (req, res) => {
  const user = await userService.profileOf(req.user._id);
  res.render("admin/pages/platform/profile", {
    pageTitle: "Thông tin tài khoản",
    profile: user,
    error: null,
  });
});

const removeAdmin = boBatLoi(async (req, res) => {
  try {
    await userService.removeAdmin(req.user._id, req.params.id);
    req.flash("success", "Đã xóa quản trị viên");
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Không xóa được";
    req.flash("error", message);
  }
  return res.redirect("/admin/admins");
});

const changePassword = boBatLoi(async (req, res) => {
  try {
    if (String(req.body.newPassword || "") !== String(req.body.confirm || "")) {
      throw new ServiceError("Mật khẩu nhập lại chưa khớp");
    }
    await userService.changeOwnPassword(req.user._id, req.body);
    req.flash("success", "Đã đổi mật khẩu");
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Không đổi được mật khẩu";
    req.flash("error", message);
  }
  return res.redirect("/admin/profile");
});

const saveProfile = boBatLoi(async (req, res) => {
  try {
    await userService.updateSelf(req.user._id, req.body);
    req.flash("success", "Đã lưu thông tin");
    return res.redirect("/admin/profile");
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Không lưu được";
    const user = await userService.profileOf(req.user._id);
    return res.status(400).render("admin/pages/platform/profile", {
      pageTitle: "Thông tin tài khoản",
      profile: { ...user, ...req.body },
      error: message,
    });
  }
});

module.exports = {
  owners,
  customers,
  detail,
  form,
  tao,
  sua,
  matKhau,
  khoa,
  xoa,
  admins,
  createAdmin,
  removeAdmin,
  profile,
  saveProfile,
  changePassword,
};
