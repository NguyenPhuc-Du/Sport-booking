# Hướng dẫn code trang tài khoản `/admin/users`

Tài liệu này chỉ để bạn tự gõ. Không kèm sửa source.

Phạm vi đã chốt:

- Danh sách tài khoản đọc từ collection `users`.
- Tạo tài khoản: họ tên, email, số điện thoại, mật khẩu, chức danh.
- Sửa thông tin: họ tên, email, số điện thoại. Ô mật khẩu để trống thì giữ mật khẩu cũ.
- Đổi chức danh ghi thẳng `users.role`. Ba giá trị cố định: `USER`, `OWNER`, `ADMIN`.
- Khóa và mở khóa ghi `status`: `inactive` hoặc `active`. Nút này nằm cạnh nút Đổi vai trò.
- Không xóa user. Không dùng collection `roles` và `user_roles`.
- Dashboard, cơ sở, đơn đặt, tài chính không làm trong đợt này. Không thêm mục sidebar.

Làm đúng thứ tự file bên dưới. Mỗi file lưu xong rồi mới sang file sau.

---

## Việc không đụng

Giữ nguyên:

- `models/user.model.js`
- `services/admin/auth.service.js`
- `middlewares/admin/authenticate.middleware.js`
- `middlewares/admin/require-admin.middleware.js`
- `routes/admin/index.route.js`
- `views/owner/layouts/default.pug`
- `views/owner/partials/sider.pug`
- Mọi file trong `views/owner`, `controllers/owner`, `routes/owner`

`routes/admin/index.route.js` đã có `app.use(PATH + "/users", userRoutes)`. Không viết lại file đó.

---

## 1. `services/admin/user.service.js`

Thay toàn bộ file bằng khối này.

`list`, `changeRole`, `changeStatus` giữ luật cũ. Thêm `create` và `updateProfile`.

`create` băm mật khẩu bằng bcrypt rồi `User.create`. Email và số điện thoại cắt khoảng trắng. Số điện thoại bỏ hết dấu cách để `0912 345 678` và `0912345678` không thành hai tài khoản.

`updateProfile` không đổi `role` và không đổi `status`. Mật khẩu rỗng thì không ghi đè `password_hash`.

```javascript
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");

const PAGE_SIZE = 8;
const ROLES = ["USER", "OWNER", "ADMIN"];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isID(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function cleanPhone(value) {
  return String(value || "").replace(/\s+/g, "");
}

function readProfile(body) {
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = cleanPhone(body.phone);
  if (!fullName) throw new ServiceError("Nhập họ và tên");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ServiceError("Email không đúng định dạng");
  }
  if (phone.length < 8) throw new ServiceError("Số điện thoại chưa hợp lệ");
  return { fullName, email, phone };
}

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const q = (query.q || "").trim();
  const status =
    query.status === "active" || query.status === "inactive" ? query.status : "";
  const roleCode = ROLES.includes(query.role) ? query.role : "";

  const filter = {};
  if (status) filter.status = status;
  if (roleCode) filter.role = roleCode;
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password_hash")
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  return {
    users,
    page,
    pages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
    total,
    q,
    status,
    role: roleCode,
  };
}

async function create(body) {
  const profile = readProfile(body);
  const role = ROLES.includes(body.role) ? body.role : "";
  const password = String(body.password || "");
  if (!role) throw new ServiceError("Chọn một vai trò hợp lệ");
  if (password.length < 6) throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");

  const existed = await User.findOne({
    $or: [{ email: profile.email }, { phone: profile.phone }],
  }).lean();
  if (existed) throw new ServiceError("Email hoặc số điện thoại đã có");

  const password_hash = await bcrypt.hash(password, 10);
  try {
    await User.create({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      password_hash,
      role,
      status: "active",
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Email hoặc số điện thoại đã có");
    }
    throw error;
  }
}

async function updateProfile(targetId, body) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  const profile = readProfile(body);
  const password = String(body.password || "");
  if (password && password.length < 6) {
    throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");
  }

  const target = await User.findById(targetId);
  if (!target) throw new ServiceError("Không có tài khoản này");

  const duplicated = await User.findOne({
    _id: { $ne: targetId },
    $or: [{ email: profile.email }, { phone: profile.phone }],
  }).lean();
  if (duplicated) throw new ServiceError("Email hoặc số điện thoại đã có");

  target.fullName = profile.fullName;
  target.email = profile.email;
  target.phone = profile.phone;
  if (password) target.password_hash = await bcrypt.hash(password, 10);

  try {
    await target.save();
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Email hoặc số điện thoại đã có");
    }
    throw error;
  }
}

async function changeRole(actorId, targetId, role) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!ROLES.includes(role)) throw new ServiceError("Không có vai trò này");

  const target = await User.findById(targetId).lean();
  if (!target) throw new ServiceError("Không có tài khoản này");

  if (target.role === "ADMIN" && role !== "ADMIN") {
    if (String(actorId) === String(targetId)) {
      throw new ServiceError("Không thể tự gỡ quyền ADMIN của chính mình");
    }
    const admins = await User.countDocuments({ role: "ADMIN" });
    if (admins <= 1) {
      throw new ServiceError("Phải giữ ít nhất một tài khoản ADMIN");
    }
  }

  await User.updateOne({ _id: targetId }, { role });
}

async function changeStatus(actorId, targetId, status) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!["active", "inactive"].includes(status)) {
    throw new ServiceError("Trạng thái không hợp lệ");
  }
  if (String(actorId) === String(targetId) && status === "inactive") {
    throw new ServiceError("Không thể tự khóa tài khoản đang đăng nhập");
  }
  const updated = await User.findByIdAndUpdate(
    targetId,
    { status },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ServiceError("Không có tài khoản này");
}

module.exports = { list, create, updateProfile, changeRole, changeStatus };
```

---

## 2. `validates/admin/platform-user.validate.js`

Thay toàn bộ file. Validate chỉ chặn form rỗng và giá trị lạ. Trùng email để service xử lý, vì validate không mở database.

```javascript
function assignRole(req, res, next) {
  if (!["USER", "OWNER", "ADMIN"].includes(req.body.role)) {
    req.flash("error", "Chọn một vai trò hợp lệ");
    return res.redirect("/admin/users");
  }
  return next();
}

function changeStatus(req, res, next) {
  if (!["active", "inactive"].includes(req.body.status)) {
    req.flash("error", "Trạng thái không hợp lệ");
    return res.redirect("/admin/users");
  }
  return next();
}

function create(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  const role = req.body.role;

  if (!fullName || !email || !phone) {
    req.flash("error", "Nhập đủ họ tên, email và số điện thoại");
    return res.redirect("/admin/users");
  }
  if (!["USER", "OWNER", "ADMIN"].includes(role)) {
    req.flash("error", "Chọn một vai trò hợp lệ");
    return res.redirect("/admin/users");
  }
  if (password.length < 6) {
    req.flash("error", "Mật khẩu tối thiểu 6 ký tự");
    return res.redirect("/admin/users");
  }
  return next();
}

function update(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");

  if (!fullName || !email || !phone) {
    req.flash("error", "Nhập đủ họ tên, email và số điện thoại");
    return res.redirect("/admin/users");
  }
  if (password && password.length < 6) {
    req.flash("error", "Mật khẩu tối thiểu 6 ký tự");
    return res.redirect("/admin/users");
  }
  return next();
}

module.exports = { assignRole, changeStatus, create, update };
```

---

## 3. `controllers/admin/user.controller.js`

Thay toàn bộ file. Xóa hẳn hàm `removeRole` đang bị comment.

`create` gọi `userService.create`. `update` gọi `userService.updateProfile`. Hai hàm này không nhận `actorId` vì không đụng role và status.

Flash khóa ghi khác flash mở khóa, để góc màn hình hiện đúng câu trong ảnh.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const userService = require("../../services/admin/user.service");
const { ServiceError } = require("../../services/admin/auth.service");

function fail(req, res, error) {
  const message =
    error instanceof ServiceError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect(req.get("Referrer") || "/admin/users");
}

const index = asyncHandler(async (req, res) => {
  const data = await userService.list(req.query);
  res.render("admin/pages/platform/users", {
    pageTitle: "Quản lý Người dùng & Tài khoản",
    activeMenu: "users",
    ...data,
  });
});

const create = asyncHandler(async (req, res) => {
  try {
    await userService.create(req.body);
    req.flash("success", "Đã tạo tài khoản");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect("/admin/users");
});

const update = asyncHandler(async (req, res) => {
  try {
    await userService.updateProfile(req.params.id, req.body);
    req.flash("success", "Đã cập nhật thông tin");
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
    await userService.changeStatus(req.user._id, req.params.id, req.body.status);
    const locked = req.body.status === "inactive";
    req.flash("success", locked ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect(req.get("Referrer") || "/admin/users");
});

module.exports = { index, create, update, assignRole, changeStatus };
```

---

## 4. `routes/admin/user.route.js`

Thay toàn bộ file. Thứ tự route: tạo trước, rồi đổi role, đổi trạng thái, sửa thông tin.

`POST /:id` không nuốt `POST /:id/roles` vì URL role có thêm một đoạn `/roles`.

```javascript
const express = require("express");
const controller = require("../../controllers/admin/user.controller");
const validate = require("../../validates/admin/platform-user.validate");

const router = express.Router();

router.get("/", controller.index);
router.post("/", validate.create, controller.create);
router.post("/:id/roles", validate.assignRole, controller.assignRole);
router.post("/:id/status", validate.changeStatus, controller.changeStatus);
router.post("/:id", validate.update, controller.update);

module.exports = router;
```

---

## 5. `views/admin/pages/platform/users.pug`

Thay toàn bộ file.

Mỗi hàng có ba việc cạnh nhau:

- Sửa mở `dialog` của chính hàng đó.
- Đổi vai trò mở `dialog` thứ hai của hàng đó.
- Khóa hoặc Mở khóa là form POST, có `data-confirm`.

Một `dialog` tạo tài khoản nằm ngoài vòng lặp. Mật khẩu bắt buộc lúc tạo. Lúc sửa, mật khẩu không `required`.

Mã hiện trên bảng là 6 ký tự cuối của `_id`. Không lưu mã `USR-001` vào database.

Nhãn vai trò:

- `ADMIN` hiện "Quản trị"
- `OWNER` hiện "Chủ sân"
- `USER` hiện "Khách hàng"

```pug
extends ../../../owner/layouts/default.pug
include ../../../mixins/alert.pug

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Tài khoản
      h1.pf-title Quản lý Người dùng & Tài khoản
    button.sz-btn.sz-btn-green(type="button" data-open="dialog-create") Thêm tài khoản mới

  form.pf-filters(method="get" action="/admin/users")
    input.sz-input(type="search" name="q" value=q placeholder="Tìm theo tên, email hoặc số điện thoại")
    select.sz-select(name="role")
      option(value="" selected=!role) Tất cả vai trò
      option(value="ADMIN" selected=role === "ADMIN") ADMIN
      option(value="OWNER" selected=role === "OWNER") OWNER
      option(value="USER" selected=role === "USER") USER
    select.sz-select(name="status")
      option(value="" selected=!status) Tất cả trạng thái
      option(value="active" selected=status === "active") Hoạt động
      option(value="inactive" selected=status === "inactive") Đã khóa
    button.sz-btn.sz-btn-dark(type="submit") Lọc

  section.sz-card.sz-panel
    if users.length
      .table-responsive
        table.sz-table
          thead
            tr
              th Họ tên
              th Liên hệ
              th Vai trò
              th Trạng thái
              th Ngày tham gia
              th Hành động
          tbody
            each u in users
              - const parts = String(u.fullName || "").trim().split(/\s+/).filter(Boolean)
              - const initials = ((parts[0] && parts[0][0]) || "U") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
              - const shortId = String(u._id).slice(-6).toUpperCase()
              - const roleLabel = u.role === "ADMIN" ? "Quản trị" : u.role === "OWNER" ? "Chủ sân" : "Khách hàng"
              - const nextStatus = u.status === "active" ? "inactive" : "active"
              tr
                td
                  .pf-person
                    span.pf-avatar= initials.toUpperCase()
                    div
                      strong= u.fullName
                      small.sz-muted= shortId
                td
                  div= u.email
                  small.sz-muted= u.phone
                td
                  span.sz-role(class=`role-${String(u.role || "user").toLowerCase()}`)= u.role
                  small.sz-muted  #{roleLabel}
                td
                  if u.status === "active"
                    span.sz-badge.sz-badge-ok Hoạt động
                  else
                    span.sz-badge.sz-badge-danger Đã khóa
                td= u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "—"
                td
                  .pf-actions
                    button.sz-btn.sz-btn-sm(type="button" data-open=`edit-${u._id}`) Sửa
                    button.sz-btn.sz-btn-sm(type="button" data-open=`role-${u._id}`) Đổi vai trò
                    form(method="post" action=`/admin/users/${u._id}/status` data-confirm=u.status === "active" ? `Khóa đăng nhập của ${u.fullName}?` : `Mở khóa ${u.fullName}?`)
                      input(type="hidden" name="status" value=nextStatus)
                      button.sz-btn.sz-btn-sm(type="submit" class=u.status === "active" ? "sz-btn-outline-danger" : "sz-btn-green")
                        = u.status === "active" ? "Khóa" : "Mở khóa"

              dialog.pf-dialog(id=`edit-${u._id}`)
                form(method="post" action=`/admin/users/${u._id}`)
                  .pf-dialog-head
                    h2 Sửa thông tin
                    button(type="button" data-close aria-label="Đóng") ×
                  p.sz-muted= u.fullName
                  label Họ và tên
                  input.sz-input(type="text" name="fullName" value=u.fullName required)
                  label Email
                  input.sz-input(type="email" name="email" value=u.email required)
                  label Số điện thoại
                  input.sz-input(type="text" name="phone" value=u.phone required)
                  label Mật khẩu mới
                  input.sz-input(type="password" name="password" minlength="6" autocomplete="new-password" placeholder="Để trống nếu giữ mật khẩu cũ")
                  .pf-dialog-actions
                    button.sz-btn(type="button" data-close) Hủy
                    button.sz-btn.sz-btn-green(type="submit") Lưu

              dialog.pf-dialog(id=`role-${u._id}`)
                form(method="post" action=`/admin/users/${u._id}/roles`)
                  .pf-dialog-head
                    h2 Thay đổi vai trò
                    button(type="button" data-close aria-label="Đóng") ×
                  p
                    strong= u.fullName
                    br
                    span.sz-muted #{u.email} · #{u.phone}
                  label.pf-choice
                    input(type="radio" name="role" value="ADMIN" checked=u.role === "ADMIN" required)
                    span
                      strong ADMIN
                      small Quản trị hệ thống
                  label.pf-choice
                    input(type="radio" name="role" value="OWNER" checked=u.role === "OWNER")
                    span
                      strong OWNER
                      small Chủ sân
                  label.pf-choice
                    input(type="radio" name="role" value="USER" checked=u.role === "USER")
                    span
                      strong USER
                      small Khách hàng
                  .pf-dialog-actions
                    button.sz-btn(type="button" data-close) Hủy
                    button.sz-btn.sz-btn-green(type="submit") Lưu thay đổi

      nav.pf-pager
        if page > 1
          a(href=`/admin/users?page=${page - 1}&q=${encodeURIComponent(q)}&role=${role}&status=${status}`) Trước
        span Trang #{page} / #{pages} · #{total} tài khoản
        if page < pages
          a(href=`/admin/users?page=${page + 1}&q=${encodeURIComponent(q)}&role=${role}&status=${status}`) Sau
    else
      p.sz-empty Không có tài khoản khớp bộ lọc.

  dialog.pf-dialog#dialog-create
    form(method="post" action="/admin/users")
      .pf-dialog-head
        h2 Tạo tài khoản người dùng mới
        button(type="button" data-close aria-label="Đóng") ×
      label Họ và tên
      input.sz-input(type="text" name="fullName" required placeholder="Ví dụ: Lê Hoàng Long")
      label Email
      input.sz-input(type="email" name="email" required placeholder="ten@email.com")
      label Số điện thoại
      input.sz-input(type="text" name="phone" required placeholder="0912345678")
      label Mật khẩu
      input.sz-input(type="password" name="password" required minlength="6" autocomplete="new-password")
      label Chức danh
      select.sz-select(name="role" required)
        option(value="USER" selected) USER (Khách hàng)
        option(value="OWNER") OWNER (Chủ sân)
        option(value="ADMIN") ADMIN (Quản trị)
      .pf-dialog-actions
        button.sz-btn(type="button" data-close) Hủy
        button.sz-btn.sz-btn-green(type="submit") Tạo tài khoản

block script
  script(src="/admin/js/platform.js")
```

`dialog` của từng user đặt trong `tbody`, sau mỗi `tr`. Pug và HTML cho phép như vậy. Không nhét `dialog` vào trong `tr`.

---

## 6. `public/admin/css/platform.css`

Không xóa CSS cũ. Dán thêm vào cuối file.

```css
.pf-person {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pf-person strong,
.pf-person small {
  display: block;
}
.pf-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #d1fae5;
  color: #047857;
  font-size: 12px;
  font-weight: 800;
  flex: none;
}
.pf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pf-actions form {
  margin: 0;
}
.pf-dialog {
  border: 0;
  border-radius: 18px;
  padding: 22px;
  width: min(440px, calc(100vw - 32px));
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}
.pf-dialog::backdrop {
  background: rgba(15, 23, 42, 0.45);
}
.pf-dialog label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 700;
}
.pf-dialog .sz-input,
.pf-dialog .sz-select {
  width: 100%;
}
.pf-dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.pf-dialog-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}
.pf-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}
.pf-choice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
}
.pf-choice small {
  display: block;
  color: var(--muted);
  font-weight: 600;
}
```

---

## 7. `public/admin/js/platform.js`

Thay toàn bộ file. Giữ xác nhận trước khi khóa. Thêm mở và đóng `dialog`.

```javascript
document.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open]");
  if (openButton) {
    const dialog = document.getElementById(openButton.getAttribute("data-open"));
    if (dialog) dialog.showModal();
  }

  const closeButton = event.target.closest("[data-close]");
  if (closeButton) {
    const dialog = closeButton.closest("dialog");
    if (dialog) dialog.close();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  const message = form.getAttribute("data-confirm");
  if (!message) return;
  if (!window.confirm(message)) event.preventDefault();
});
```

Nút trong `dialog` không được lồng ra ngoài `form`. Khối Pug ở bước 5 đã đặt nút Đóng và Hủy trong `form` nhưng `type="button"`, nên bấm Hủy không gửi POST.

---

## 8. Chạy thử

Tắt server rồi `npm start`. Đăng nhập admin. Mở `/admin/users`.

1. Bảng hiện user thật trong Compass. Không còn Lê Thanh Bình nếu người đó không có trong `users`.
2. Bấm Thêm tài khoản mới. Tạo một email chưa có, mật khẩu từ 6 ký tự, chức danh USER. Compass có document mới, `role` là `USER`, `status` là `active`, `password_hash` là chuỗi bcrypt, không phải mật khẩu gốc.
3. Tạo lại đúng email đó. Flash "Email hoặc số điện thoại đã có". Không thêm document thứ hai.
4. Sửa họ tên người vừa tạo. Để trống mật khẩu. Compass đổi `fullName`, `password_hash` giữ nguyên.
5. Sửa và gõ mật khẩu mới. Đăng nhập bằng mật khẩu mới nếu đó là tài khoản được phép vào cửa tương ứng.
6. Đổi vai trò sang OWNER. Compass, field `role` thành `OWNER`. Không phát sinh collection `user_roles`.
7. Với chính tài khoản admin đang đăng nhập, chọn USER rồi Lưu. Flash không cho tự bỏ ADMIN. `role` vẫn là `ADMIN`.
8. Khóa một user khác. Hàng thành Đã khóa. User đó không đăng nhập admin được. Mở khóa thì về Hoạt động.
9. Khóa chính mình. Flash không cho tự khóa. `status` vẫn `active`.
10. Ô tìm và hai bộ lọc vẫn ra đúng hàng sau khi tải lại trang. Sidebar không thêm mục Tài chính, Cơ sở, Đơn đặt.
