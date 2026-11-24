# Hoàn thiện giao diện web quản trị

Tài liệu để tự gõ. Không sửa giúp bạn. Chỉ web `/admin`. Trang chủ sân giữ nguyên, trừ hai chỗ khoanh đúng nhánh admin ở layout và menu.

Đơn đặt xem trên `/admin/bookings`. Không link sang `/owner/bookings`. Quản trị không sửa đơn, không check-in, không hủy đơn hộ chủ sân. Trang này là danh sách để coi.

Phần còn thiếu được khép trong tài liệu này:

- Danh sách đơn có tìm mã, lọc trạng thái, phân trang, trên đúng site quản trị.
- Cơ sở là một bảng, hết khối tiêu đề bị lặp.
- Menu quản trị có đủ năm cửa, toàn link `/admin`.
- Ghi một lần chuyển tiền trên tab lịch sử. Hết cảnh bảng trống mãi vì không có chỗ nhập.
- Giao diện một nhịp: cùng tiêu đề, cùng thẻ, cùng bảng, cùng nút, cùng trạng thái màu. Footer trang bán hàng không hiện khi đang ở admin.

Không viết lại trang tài khoản. Không viết lại công thức hoa hồng. Không thêm nút xóa user.

---

## Cách nhìn một trang

Mỗi màn chỉ có bốn tầng, từ trên xuống:

1. Một dòng nhỏ màu xanh, rồi một tiêu đề. Không giải thích database.
2. Thẻ số hoặc thanh lọc. Việc chính nằm ở đây.
3. Một bảng hoặc một form. Hàng cách nhau đủ để đọc, tiền căn phải, trạng thái là viên thuốc màu chứ không phải chữ tiếng Anh.
4. Trang trống thì một câu. Không để bảng không có chữ.

Năm cửa trên menu, đúng thứ tự:

| Cửa | URL | Việc |
|---|---|---|
| Tổng quan sàn | `/admin/dashboard` | Bốn số, tuần, sáu đơn mới |
| Tài khoản | `/admin/users` | Giữ như đang chạy |
| Đơn đặt | `/admin/bookings` | Danh sách toàn sàn |
| Cơ sở | `/admin/venues` | Sân đang mở |
| Hoa hồng | `/admin/commissions` | Đối soát, lịch sử chuyển, cấu hình |

Bấm một đơn trên dashboard thì ra `/admin/bookings?q=mã-đơn`, vẫn là trang quản trị.

---

## 1. `services/admin/user.service.js`

Chỉ sửa dòng cuối. `escapeRegex` đã có trong file. Trang đơn dùng lại hàm này để tìm mã, không viết hàm escape thứ hai.

Đổi:

```javascript
module.exports = { list, create, updateProfile, changeRole, changeStatus };
```

thành:

```javascript
module.exports = {
  list,
  create,
  updateProfile,
  changeRole,
  changeStatus,
  escapeRegex,
};
```

## 2. `services/admin/stats.service.js`

Thay hàm `listBookings` bằng hàm dưới. Dashboard vẫn gọi `listBookings(6)`. Trang đơn gọi `listBookings(12, req.query)`.

Nhãn trạng thái tiếng Việt nằm một chỗ, bảng và dashboard cùng dùng `rowOf`.

```javascript
const STATUS = {
  pending_payment: { label: "Chờ thanh toán", tone: "wait" },
  upcoming: { label: "Sắp diễn ra", tone: "soon" },
  completed: { label: "Đã hoàn tất", tone: "done" },
  cancelled: { label: "Đã hủy", tone: "off" },
};

function rowOf(doc) {
  const status = STATUS[doc.status] || { label: doc.statusLabel || "—", tone: "off" };
  return {
    code: doc.code,
    guestName: doc.guestName || "Khách",
    facilityName: doc.facilityName,
    courtName: doc.courtName,
    date: doc.date,
    time: doc.time,
    amount: doc.amount,
    amountLabel: formatVnd(doc.amount),
    status: doc.status,
    statusLabel: status.label,
    tone: status.tone,
  };
}

async function listBookings(limit, query) {
  const source = query || {};
  const page = Math.max(parseInt(source.page, 10) || 1, 1);
  const q = String(source.q || "").trim();
  const status = STATUS[source.status] ? source.status : "";
  const size = limit || 12;
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const { escapeRegex } = require("./user.service");
    filter.code = new RegExp(escapeRegex(q), "i");
  }

  const total = await Booking.countDocuments(filter);
  const items = await Booking.find(filter)
    .select("code guestName facilityName courtName date time amount status")
    .sort({ createdAt: -1 })
    .skip((page - 1) * size)
    .limit(size)
    .lean();

  return {
    items: items.map(rowOf),
    total,
    page,
    pages: Math.max(Math.ceil(total / size), 1),
    q,
    status,
  };
}
```

Xóa hàm `rowOf` cũ phía trên file để không khai báo hai lần. Thêm `const STATUS` ngay trên hàm `rowOf` mới.

`require("./user.service")` đặt trong hàm, không đặt đầu file. Đặt đầu file thì `user.service` và `stats.service` kéo nhau lúc khởi động.

Thay cả `listPayouts` và thêm `recordPayout` ngay bên dưới. Hết `listCollections`.

```javascript
const Payout = require("../../models/payout.model");

async function listPayouts() {
  const rows = await Payout.find().sort({ paidAt: -1 }).limit(20).lean();
  return rows.map((row) => ({
    ownerName: row.ownerName,
    amount: row.amount,
    amountLabel: formatVnd(row.amount),
    paidAt: row.paidAt ? new Date(row.paidAt).toLocaleDateString("vi-VN") : "—",
    note: row.note || "",
  }));
}

async function recordPayout(body) {
  const ownerName = String(body.ownerName || "").trim();
  const amount = Number(body.amount);
  const note = String(body.note || "").trim();
  if (!ownerName) throw new ServiceError("Nhập tên chủ sân");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ServiceError("Số tiền chuyển phải lớn hơn 0");
  }
  await Payout.create({ ownerName, amount, note, paidAt: new Date() });
}
```

Đưa `Payout` vào cụm `require` đầu file, cạnh `Setting`. Thêm `recordPayout` vào `module.exports`.

## 3. Tạo `models/payout.model.js`

```javascript
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payout", schema, "payouts");
```

Một lần bấm Lưu là một document. Không sửa, không xóa trên giao diện. Muốn điều chỉnh thì sửa trong Compass.

## 4. `controllers/admin/readonly.controller.js`

Thay cả file. `activeMenu` để menu sáng đúng mục. Đơn lấy `req.query` nên lọc và phân trang chạy trên `/admin/bookings`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const statsService = require("../../services/admin/stats.service");

const venues = asyncHandler(async (req, res) => {
  const items = await statsService.listActiveVenues();
  res.render("admin/pages/platform/venues-readonly", {
    pageTitle: "Cơ sở",
    activeMenu: "venues",
    items,
  });
});

const bookings = asyncHandler(async (req, res) => {
  const data = await statsService.listBookings(12, req.query);
  res.render("admin/pages/platform/bookings-readonly", {
    pageTitle: "Đơn đặt",
    activeMenu: "bookings",
    ...data,
  });
});

module.exports = { venues, bookings };
```

`routes/admin/readonly.route.js` giữ nguyên. Nó đã gắn `GET /bookings` và `GET /venues` vào `/admin`. Không tạo route owner.

## 5. `controllers/admin/commission.controller.js`

Trong `index`, chỉ đọc lịch sử khi đang mở tab đó.

Thay mảng `Promise.all` bằng:

```javascript
  const summary = await statsService.commissionSummary();
  const payouts = tab === "history" ? await statsService.listPayouts() : [];
```

Thêm hàm `payout` dưới hàm `save`, và export thêm nó.

```javascript
const payout = asyncHandler(async (req, res) => {
  try {
    await statsService.recordPayout(req.body);
    req.flash("success", "Đã ghi lần chuyển tiền");
  } catch (error) {
    const message =
      error instanceof ServiceError ? error.message : "Không ghi được lần chuyển";
    req.flash("error", message);
  }
  return res.redirect("/admin/commissions?tab=history");
});

module.exports = { index, save, payout };
```

## 6. `routes/admin/commission.route.js`

Thêm một dòng dưới `router.post("/settings", controller.save);`:

```javascript
router.post("/payouts", controller.payout);
```

## 7. `views/admin/pages/platform/bookings-readonly.pug`

Thay cả file. Mọi link đều `/admin/bookings`.

```pug
extends ../../../owner/layouts/default.pug
include ../../../mixins/alert.pug

block main
  +alert-error(4000)

  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Đơn đặt
      h1.pf-title Danh sách đơn toàn sàn
      p.pf-sub Xem mã, sân, giờ và tiền. Trang này không sửa đơn.

  form.pf-filters(method="get" action="/admin/bookings")
    input.sz-input(type="search" name="q" value=q placeholder="Tìm theo mã đơn")
    select.sz-select(name="status")
      option(value="" selected=!status) Mọi trạng thái
      option(value="pending_payment" selected=status === "pending_payment") Chờ thanh toán
      option(value="upcoming" selected=status === "upcoming") Sắp diễn ra
      option(value="completed" selected=status === "completed") Đã hoàn tất
      option(value="cancelled" selected=status === "cancelled") Đã hủy
    button.sz-btn.sz-btn-dark(type="submit") Lọc

  section.sz-card.sz-panel
    if items.length
      .table-responsive
        table.sz-table.pf-table
          thead
            tr
              th Mã đơn
              th Khách
              th Cơ sở và sân
              th Thời gian
              th.pf-num Tiền
              th Trạng thái
          tbody
            each item in items
              tr
                td
                  strong= item.code
                td= item.guestName
                td
                  div= item.facilityName
                  small.sz-muted= item.courtName
                td
                  div= item.date
                  small.sz-muted= item.time
                td.pf-num= item.amountLabel
                td
                  span.pf-pill(class=`is-${item.tone}`)= item.statusLabel
      nav.pf-pager
        if page > 1
          a(href=`/admin/bookings?page=${page - 1}&q=${encodeURIComponent(q)}&status=${status}`) Trước
        span Trang #{page} / #{pages} · #{total} đơn
        if page < pages
          a(href=`/admin/bookings?page=${page + 1}&q=${encodeURIComponent(q)}&status=${status}`) Sau
    else
      .pf-empty
        strong Không có đơn khớp bộ lọc
        p Thử mã khác hoặc chọn Mọi trạng thái.
```

## 8. `views/admin/pages/platform/venues-readonly.pug`

Thay cả file. File hiện có hai bảng chồng nhau. Chỉ để một bảng.

```pug
extends ../../../owner/layouts/default.pug

block main
  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Cơ sở
      h1.pf-title Cơ sở đang mở
      p.pf-sub Chủ sân tự bật tắt sân. Trang này chỉ để xem.

  section.sz-card.sz-panel
    if items.length
      .table-responsive
        table.sz-table.pf-table
          thead
            tr
              th Cơ sở
              th Địa chỉ
              th Chủ sân
              th Trạng thái
          tbody
            each item in items
              tr
                td
                  strong= item.name
                td #{item.address || ""}#{item.district ? ", " + item.district : ""}#{item.city ? ", " + item.city : ""}
                td= item.owner_id && item.owner_id.fullName ? item.owner_id.fullName : "—"
                td
                  span.pf-pill.is-done Đang mở
    else
      .pf-empty
        strong Chưa có cơ sở đang mở
        p Khi chủ sân bật sân, cơ sở sẽ xuất hiện ở đây.
```

## 9. Dashboard, chỉ sửa link đơn

Trong `views/admin/pages/platform/dashboard.pug`, dòng "Xem tất cả" giữ `href="/admin/bookings"`.

Trong vòng `each item in recent`, bọc mã đơn bằng link sang đúng đơn trên trang quản trị:

```pug
a.pf-order(href=`/admin/bookings?q=${encodeURIComponent(item.code)}`)
  div
    strong= item.code
    small.sz-muted #{item.facilityName} · #{item.courtName}
  div
    span= item.amountLabel
    small.sz-muted #{item.date} · #{item.time}
```

Xóa `div.pf-order` cũ. Không trỏ `/owner`.

## 10. Hoa hồng, chữ và form chuyển tiền

Trong `views/admin/pages/platform/commissions.pug`:

Đổi câu dưới thẻ tổng tiền từ `Đơn upcoming và completed` thành `Đơn đã xác nhận`.

Đổi câu hạn mức thành:

```pug
span.pf-stat-note Hạn mức #{summary.minPayout.toLocaleString("vi-VN")} đ
```

Trong nhánh `tab === "history"`, thay cả `section` bằng:

```pug
    section.sz-card.sz-panel
      h2.sz-panel-title Ghi một lần chuyển
      form.pf-pay(method="post" action="/admin/commissions/payouts")
        input.sz-input(type="text" name="ownerName" required placeholder="Tên chủ sân")
        input.sz-input(type="number" name="amount" min="1" step="1000" required placeholder="Số tiền")
        input.sz-input(type="text" name="note" placeholder="Ghi chú, ví dụ tuần đối soát")
        button.sz-btn.sz-btn-green(type="submit") Ghi nhận
      if payouts.length
        table.sz-table.pf-table
          thead
            tr
              th Chủ sân
              th.pf-num Số tiền
              th Ngày
              th Ghi chú
          tbody
            each row in payouts
              tr
                td= row.ownerName
                td.pf-num= row.amountLabel
                td= row.paidAt
                td= row.note
      else
        .pf-empty
          strong Chưa có lần chuyển tiền
          p Ghi nhận ở form phía trên sau khi đã chuyển khoản cho chủ sân.
```

## 11. Menu admin

Trong `views/owner/partials/sider.pug`, chỉ thay khối `nav` nằm trong `if panelRole === "admin"`. Nhánh `else` của chủ sân không đụng.

```pug
    nav.sz-menu(aria-label="Menu quản trị")
      a.sz-menu-item(href="/admin/dashboard" class=(activeMenu === "dashboard" ? "active" : undefined))
        i.bi.bi-grid
        span.sz-menu-text Tổng quan sàn
      a.sz-menu-item(href="/admin/users" class=(activeMenu === "users" ? "active" : undefined))
        i.bi.bi-people
        span.sz-menu-text Tài khoản
      a.sz-menu-item(href="/admin/bookings" class=(activeMenu === "bookings" ? "active" : undefined))
        i.bi.bi-calendar-check
        span.sz-menu-text Đơn đặt
      a.sz-menu-item(href="/admin/venues" class=(activeMenu === "venues" ? "active" : undefined))
        i.bi.bi-buildings
        span.sz-menu-text Cơ sở
      a.sz-menu-item(href="/admin/commissions" class=(activeMenu === "commissions" ? "active" : undefined))
        i.bi.bi-percent
        span.sz-menu-text Hoa hồng
```

## 12. Bỏ footer bán hàng khỏi admin

Trong `views/owner/layouts/default.pug`, đổi dòng:

```pug
    include ../partials/footer.pug
```

thành:

```pug
    if panelRole !== "admin"
      include ../partials/footer.pug
```

Chủ sân vẫn thấy footer. Quản trị kết thúc ở nội dung chính. Đây là chỗ làm trang đỡ rối nhất, vì footer hotline và hoa hồng 5% đang nằm dưới mọi bảng.

## 13. Thêm vào cuối `public/admin/css/platform.css`

File này chỉ tải khi `panelRole === "admin"`, nên không đổi giao diện chủ sân.

```css
.pf-table th {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 800;
}
.pf-table td {
  padding-top: 14px;
  padding-bottom: 14px;
  vertical-align: middle;
}
.pf-table tbody tr:hover {
  background: #f8fafc;
}
.pf-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  white-space: nowrap;
}
.pf-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
}
.pf-pill.is-wait { background: #fef3c7; color: #b45309; }
.pf-pill.is-soon { background: #dbeafe; color: #1d4ed8; }
.pf-pill.is-done { background: #d1fae5; color: #047857; }
.pf-pill.is-off { background: #f1f5f9; color: #64748b; }
.pf-empty {
  padding: 28px 8px;
  text-align: center;
}
.pf-empty strong {
  display: block;
  margin-bottom: 4px;
}
.pf-empty p {
  margin: 0;
  color: var(--muted);
}
.pf-pay {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 1.2fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}
a.pf-order {
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
}
a.pf-order:hover {
  background: #f8fafc;
}
@media (max-width: 800px) {
  .pf-pay { grid-template-columns: 1fr; }
}
```

---

## Kiểm tra một lượt

1. Vào `/admin/bookings`. Thấy bảng đơn, ô tìm mã, bốn trạng thái tiếng Việt. URL không nhảy sang `/owner`.
2. Lọc "Đã hủy" chỉ còn đơn `cancelled`. Tìm `SPZ-2001` còn một hàng. Hết kết quả thì thấy câu "Không có đơn khớp bộ lọc".
3. Từ dashboard, bấm một mã đơn. Trang mở là `/admin/bookings?q=mã-đó`.
4. Menu Có Đơn đặt và Cơ sở. Mục đang mở có nền đậm. `/admin/venues` một bảng, không hai tiêu đề.
5. Tab lịch sử hoa hồng, ghi tên chủ sân và số tiền. Tải lại thấy dòng mới, tiền có dấu ngăn cách, ngày là hôm nay.
6. Footer hotline không còn dưới dashboard. Vào trang chủ sân thì footer vẫn còn.
7. Tài khoản vẫn tạo, sửa, đổi vai trò, khóa. Không có nút xóa đơn hay xóa user.
