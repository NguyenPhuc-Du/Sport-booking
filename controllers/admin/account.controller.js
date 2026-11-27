const mongoose = require("mongoose");
const boBatLoi = require("../../helpers/boBatLoi");
const { taiExcel } = require("../../helpers/xuat-excel");
const userService = require("../../services/admin/user.service");
const accountService = require("../../services/admin/account.service");
const { ServiceError } = require("../../services/admin/auth.service");

function loi(error) {
  return error instanceof ServiceError ? error.message : "Không lưu được. Thử lại.";
}

/**
 * Giữ người dùng ở trang chi tiết nếu form gửi kèm đường dẫn hợp lệ.
 * @param {object} req Request.
 * @returns {string}
 */
function quayLai(req) {
  const next = String(req.body.next || "");
  const goc = `/admin/accounts/${req.params.loai}`;
  if (next === goc || next.startsWith(`${goc}?`) || next.startsWith(`${goc}/`)) return next;
  return goc;
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
    let phu = null;
    let loiPhu = "";
    const chon = String(req.query.chon || "");
    if (mongoose.isValidObjectId(chon)) {
      try {
        phu = await accountService.chiTiet(loai, chon, {});
      } catch (error) {
        phu = null;
        loiPhu = "Không mở được hồ sơ này.";
      }
    }
    res.render("admin/pages/platform/accounts", {
      pageTitle: meta.title,
      title: meta.title,
      moTa: `Danh sách ${meta.title.toLowerCase()} trên sàn. Bấm một dòng để mở chi tiết bên phải.`,
      basePath: path,
      loai,
      stats,
      phu,
      loiPhu,
      chon,
      ...data,
    });
  });
}

const owners = danhSach("owners");
const customers = danhSach("customers");

const detail = boBatLoi(async (req, res) => {
  try {
    const data = await accountService.chiTiet(req.params.loai, req.params.id, req.query);
    const tabHopLe = ["san", "giao-dich", "hoat-dong"];
    const tab = data.hoSo && data.hoSo.sanDangXem
      ? "san"
      : tabHopLe.includes(req.query.tab) ? req.query.tab : "tong-quan";
    res.render("admin/pages/platform/account-detail", {
      pageTitle: data.user.fullName,
      loai: req.params.loai,
      tab,
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
  const user = editing ? (await accountService.chiTiet(req.params.loai, req.params.id, {}, false)).user : null;
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
  return res.redirect(quayLai(req));
});

const khoa = boBatLoi(async (req, res) => {
  try {
    await userService.changeStatus(req.user._id, req.params.id, req.body.status, { ip: req.ip });
    req.flash("success", req.body.status === "inactive" ? "Đã khóa tài khoản" : "Đã mở tài khoản");
  } catch (error) {
    req.flash("error", loi(error));
  }
  return res.redirect(quayLai(req));
});

const xoa = boBatLoi(async (req, res) => {
  try {
    req.flash("success", await accountService.xoa(req.user._id, req.params.loai, req.params.id));
  } catch (error) {
    req.flash("error", loi(error));
  }
  return res.redirect(quayLai(req));
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

const COT_EXCEL = [
  { header: "Họ tên", key: "fullName", width: 28 },
  { header: "Email", key: "email", width: 32 },
  { header: "Số điện thoại", key: "phone", width: 18 },
  { header: "Mật khẩu", key: "password", width: 18 },
];

const xuatExcel = boBatLoi(async (req, res) => {
  const meta = accountService.loaiNao(req.params.loai);
  const rows = await userService.xuatDanhSach(req.query, meta.role);
  await taiExcel(
    res,
    `${req.params.loai}.xlsx`,
    COT_EXCEL.slice(0, 3).concat([{ header: "Trạng thái", key: "status", width: 16 }]),
    rows.map((row) => ({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      status: row.status === "active" ? "Hoạt động" : "Đã khóa",
    })),
  );
});

const mauExcel = boBatLoi(async (req, res) => {
  await taiExcel(res, "mau-tai-khoan.xlsx", COT_EXCEL, [
    { fullName: "Nguyễn Văn A", email: "a@email.com", phone: "0912345678", password: "MatKhau@1" },
  ]);
});

function docDongExcel(sheet) {
  const jobs = [];
  sheet.eachRow((row, so) => {
    if (so === 1) return;
    const fullName = String(row.getCell(1).text || "").trim();
    const email = String(row.getCell(2).text || "").trim();
    const phone = String(row.getCell(3).text || "").trim();
    const password = String(row.getCell(4).text || "").trim();
    if (!fullName && !email && !phone) return;
    jobs.push({ fullName, email, phone, password, so });
  });
  return jobs;
}

const xuatPdf = boBatLoi(async (req, res) => {
  const PDFDocument = require("pdfkit");
  const path = require("path");
  const meta = accountService.loaiNao(req.params.loai);
  const rows = await userService.xuatDanhSach(req.query, meta.role);
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${req.params.loai}.pdf"`);
  doc.pipe(res);
  doc.font(path.join(__dirname, "../../public/fonts/NotoSans-Regular.ttf"));
  doc.fontSize(16).fillColor("#047857").text(`Danh sách ${meta.title}`);
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#0f172a").text(`${rows.length} tài khoản theo bộ lọc hiện tại.`);
  doc.moveDown(0.6);
  rows.forEach((row, index) => {
    if (doc.y > 520) doc.addPage();
    const ngay = row.createdAt
      ? new Date(row.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
      : "";
    doc.fontSize(9).text(
      `${index + 1}. ${row.fullName}  ·  ${row.email}  ·  ${row.phone}  ·  ${row.status === "active" ? "Hoạt động" : "Đã khóa"}  ·  ${ngay}`,
    );
  });
  doc.end();
});

const hangLoat = boBatLoi(async (req, res) => {
  const loai = req.params.loai;
  const goc = `/admin/accounts/${loai}`;
  const next = String(req.body.next || "");
  const ve = next.startsWith(goc) ? next : goc;
  const quyen = (req.access && req.access.permissions) || [];
  const viec = String(req.body.viec || "");
  if ((viec === "khoa" || viec === "mo") && !quyen.includes("user:lock")) {
    req.flash("error", "Bạn không có quyền khóa tài khoản");
    return res.redirect(ve);
  }
  if (viec === "xoa" && !quyen.includes("user:update")) {
    req.flash("error", "Bạn không có quyền xóa tài khoản");
    return res.redirect(ve);
  }
  if (!["khoa", "mo", "xoa"].includes(viec)) {
    req.flash("error", "Chọn một thao tác");
    return res.redirect(ve);
  }
  const ids = [].concat(req.body.ids || []).map(String).filter((id) => mongoose.isValidObjectId(id)).slice(0, 50);
  let xong = 0;
  const loiDong = [];
  for (const id of ids) {
    try {
      if (viec === "xoa") await accountService.xoa(req.user._id, loai, id);
      else await userService.changeStatus(req.user._id, id, viec === "khoa" ? "inactive" : "active", { ip: req.ip });
      xong += 1;
    } catch (error) {
      loiDong.push(error.message || "Không xử lý được");
    }
  }
  if (xong) req.flash("success", `Đã xử lý ${xong} tài khoản`);
  if (loiDong.length) req.flash("error", loiDong.slice(0, 3).join(". "));
  if (!xong && !loiDong.length) req.flash("error", "Chưa chọn tài khoản");
  return res.redirect(ve);
});

const nhapExcel = boBatLoi(async (req, res) => {
  const meta = accountService.loaiNao(req.params.loai);
  const ve = `/admin/accounts/${req.params.loai}`;
  if (!req.file) {
    if (String(req.query.xem) === "1") return res.status(400).json({ message: "Chọn file Excel .xlsx" });
    req.flash("error", "Chọn file Excel .xlsx");
    return res.redirect(ve);
  }
  const ExcelJS = require("exceljs");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.file.buffer);
  } catch (error) {
    if (String(req.query.xem) === "1") return res.status(400).json({ message: "Không đọc được file Excel" });
    req.flash("error", "Không đọc được file Excel");
    return res.redirect(ve);
  }
  const sheet = wb.worksheets[0];
  if (!sheet) {
    req.flash("error", "File không có trang tính");
    return res.redirect(ve);
  }
  let tao = 0;
  const loiDong = [];
  const jobs = docDongExcel(sheet);
  if (String(req.query.xem) === "1") {
    return res.json({
      dong: jobs.map((dong) => ({
        so: dong.so,
        fullName: dong.fullName,
        email: dong.email,
        phone: dong.phone,
        loi: dong.password.length < 8 ? "Mật khẩu tối thiểu 8 ký tự" : "",
      })),
    });
  }
  for (const dong of jobs) {
    if (dong.password.length < 8) {
      loiDong.push(`Dòng ${dong.so}: mật khẩu tối thiểu 8 ký tự`);
      continue;
    }
    try {
      await userService.create(req.user._id, { ...dong, role: meta.role }, { ip: req.ip });
      tao += 1;
    } catch (error) {
      loiDong.push(`Dòng ${dong.so}: ${error.message || "không lưu được"}`);
    }
  }
  if (tao) req.flash("success", `Đã thêm ${tao} tài khoản từ Excel`);
  if (loiDong.length) req.flash("error", loiDong.slice(0, 5).join(". "));
  if (!tao && !loiDong.length) req.flash("error", "File không có dòng dữ liệu");
  return res.redirect(ve);
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
  xuatExcel,
  mauExcel,
  nhapExcel,
  xuatPdf,
  hangLoat,
};
