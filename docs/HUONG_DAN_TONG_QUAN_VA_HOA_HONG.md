# Tổng quan sàn và hoa hồng — web quản trị

Tài liệu để tự gõ. Không sửa source giúp bạn. Chỉ đụng web `/admin`. Không sửa `/owner`, app khách, voucher chủ sân.

Đã đọc code đang chạy ngày 2/11/2026. Trang tài khoản đã có `list`, `create`, `updateProfile`, `changeRole`, `changeStatus`. Dashboard mới có bốn số. `stats.service.js` vẫn gọi `listCollections` rồi đọc collection `bookings` thô, trong khi `models/booking.model.js` đã có. Trang hoa hồng chưa có. `controllers/admin/platform-permissions.controller.js` vẫn là mảng user giả và không được mount. Không đưa file đó trở lại menu.

---

## Góp ý CRUD

| Phần | Đủ chưa | Việc được phép |
|---|---|---|
| Tài khoản | Đủ phần đã chốt | Xem, tạo, sửa họ tên/email/điện thoại/mật khẩu, đổi `users.role`, khóa `status`. Không xóa user |
| Tổng quan | Chỉ xem | Bốn số, biểu đồ tuần, đơn mới. Không nút ghi |
| Hoa hồng | Xem và sửa một cấu hình | Sửa tỷ lệ, chu kỳ, hạn mức. Không tạo từng dòng hoa hồng bằng tay. Số tiền là kết quả tính từ `bookings` |
| Lịch sử chuyển tiền | Chỉ xem | Mảng rỗng cho đến khi có document. Không có nút xóa |

Không thêm Create/Delete cho hoa hồng từng đơn. Một đơn đã `upcoming` hoặc `completed` thì hoa hồng là `amount` nhân tỷ lệ. Tạo thêm bản ghi hoa hồng sẽ thành hai nguồn số.

---

## Hàm dùng lại, không viết hàm mới cùng việc

Các hàm sau đã có. Trang mới chỉ gọi chúng.

| Hàm sẵn | File | Dùng lại cho |
|---|---|---|
| `asyncHandler` | `middlewares/admin/async-handler.js` | Mọi controller mới |
| `ServiceError` | `services/admin/auth.service.js` | Lỗi tỷ lệ, chu kỳ, hạn mức |
| `getOverview` | `services/admin/stats.service.js` | Bốn thẻ dashboard. Sửa bên trong, không viết `getOverview2` |
| `listBookings` | cùng file | Cột đơn mới trên dashboard và trang `/admin/bookings` |
| `listActiveVenues` | cùng file | `/admin/venues`, không đụng |

Việc mới chỉ là ba hàm dùng chung, đặt một lần:

- `formatVnd` và `percentLabel` trong `services/admin/present.js`. Dashboard và hoa hồng cùng gọi. Pug không tự format tiền.
- `paidMatch` nằm trong `stats.service.js`. Đếm GMV, biểu đồ tuần, đối soát chủ sân cùng một điều kiện đơn đã tính tiền.
- `getCommission` và `saveCommission` trong `stats.service.js`, không mở file service thứ hai. Cấu hình hoa hồng là một document, không phải một module mới.

`listCollections` bỏ. Mỗi lần mở dashboard đang mất một vòng hỏi tên collection trước khi đếm. Model Booking đã trỏ collection `bookings`.

---

## Thông số nhìn nhanh

Người đọc chỉ cần đối chiếu các mảng này với MongoDB và với biến Pug. Thiếu document thì mảng là `[]`, số là `0`. Không viết số mẫu `241.300.000` trong controller.

Đơn đưa ra màn hình, mỗi phần tử:

```javascript
{
  code: "SPZ-1001",
  facilityName: "SportPro Complex Cầu Giấy",
  courtName: "Sân 1",
  date: "2026-10-19",
  time: "19:00 - 20:00",
  amount: 210000,
  amountLabel: "210.000 ₫",
  status: "upcoming",
  statusLabel: "SẮP DIỄN RA"
}
```

`status` trong model chỉ có `pending_payment`, `upcoming`, `completed`, `cancelled`. GMV và hoa hồng chỉ cộng `upcoming` và `completed`. Đơn `pending_payment` và `cancelled` vẫn hiện trong danh sách đơn, không cộng tiền.

Bảy cột biểu đồ tuần, đúng bảy phần tử từ thứ Hai đến Chủ nhật:

```javascript
[
  { label: "T2", count: 0 },
  { label: "T3", count: 0 },
  { label: "T4", count: 0 },
  { label: "T5", count: 0 },
  { label: "T6", count: 0 },
  { label: "T7", count: 0 },
  { label: "CN", count: 0 }
]
```

`date` của booking là chuỗi `YYYY-MM-DD`, nên so sánh chuỗi được, không cần đổi sang `Date`.

Bốn thẻ hoa hồng và form cấu hình là một object:

```javascript
{
  gmv: 0,
  gmvLabel: "0 ₫",
  commission: 0,
  commissionLabel: "0 ₫",
  pendingCount: 0,
  pendingLabel: "0 ₫",
  rate: 0.05,
  ratePercent: 5,
  rateLabel: "5%",
  cycle: "weekly",
  minPayout: 1000000
}
```

`cycle` chỉ nhận `weekly`, `biweekly`, `monthly`. Form nhập tỷ lệ theo phần trăm (`5`), database lưu số thực (`0.05`).

Một dòng đối soát chủ sân:

```javascript
{
  facilityName: "Arena Tây Hồ",
  bookings: 3,
  gmv: 860000,
  gmvLabel: "860.000 ₫",
  commission: 43000,
  commissionLabel: "43.000 ₫"
}
```

Một dòng lịch sử chuyển tiền. Chưa có collection thì cả mảng là `[]`:

```javascript
{
  ownerName: "Trần Thu Hà",
  amount: 1000000,
  amountLabel: "1.000.000 ₫",
  paidAt: "19/10/2026",
  note: "Tuần 42"
}
```

`pendingLabel` là hoa hồng của các chủ sân chưa đủ `minPayout`. Không có bảng chuyển tiền thì số chờ đối soát vẫn tính được từ đơn, không cần số giả.

---

## 1. Tạo `services/admin/present.js`

File mới. Hai trang cùng dùng.

```javascript
function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function percentLabel(rate) {
  const value = Math.round(Number(rate) * 1000) / 10;
  return `${value}%`;
}

module.exports = { formatVnd, percentLabel };
```

## 2. Tạo `models/platform-setting.model.js`

Một document cho cả sàn. Không tạo collection hoa hồng theo từng đơn.

```javascript
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "commission" },
    commissionRate: { type: Number, default: 0.05, min: 0, max: 1 },
    payoutCycle: {
      type: String,
      enum: ["weekly", "biweekly", "monthly"],
      default: "weekly",
    },
    minPayout: { type: Number, default: 1000000, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PlatformSetting", schema, "platform_settings");
```

Chưa có document thì code dùng default `0.05`, `weekly`, `1000000`. Bấm Lưu mới ghi database.

## 3. Thay `services/admin/stats.service.js`

Thay cả file. `getOverview` và `listActiveVenues` giữ tên cũ. `listBookings` đổi thành trả đúng mảng thông số ở trên, nhận `limit` để dashboard gọi `listBookings(6)` và trang đơn gọi `listBookings(50)`.

```javascript
const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Venue = require("../../models/facilities.model");
const Booking = require("../../models/booking.model");
const Setting = require("../../models/platform-setting.model");
const { ServiceError } = require("./auth.service");
const { formatVnd, percentLabel } = require("./present");

const PAID = ["upcoming", "completed"];
const CYCLES = ["weekly", "biweekly", "monthly"];

function paidMatch(extra) {
  return { status: { $in: PAID }, ...extra };
}

function weekRange(now) {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const iso = (date) => date.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), startDate: start };
}

function rowOf(doc) {
  return {
    code: doc.code,
    facilityName: doc.facilityName,
    courtName: doc.courtName,
    date: doc.date,
    time: doc.time,
    amount: doc.amount,
    amountLabel: formatVnd(doc.amount),
    status: doc.status,
    statusLabel: doc.statusLabel || doc.status,
  };
}

async function getOverview() {
  const [users, owners, venues, bookings] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "OWNER" }),
    Venue.countDocuments({ status: "active", deleted: { $ne: true } }),
    Booking.countDocuments(),
  ]);
  return {
    users,
    owners,
    venues,
    bookings,
    bookingsExists: bookings > 0,
  };
}

async function listActiveVenues() {
  return Venue.find({ status: "active", deleted: { $ne: true } })
    .select("name address district city status owner_id created_at")
    .populate("owner_id", "fullName email")
    .sort({ created_at: -1 })
    .limit(50)
    .lean();
}

async function listBookings(limit) {
  const items = await Booking.find()
    .select("code facilityName courtName date time amount status statusLabel")
    .sort({ createdAt: -1 })
    .limit(limit || 50)
    .lean();
  return { exists: true, items: items.map(rowOf) };
}

async function weekActivity() {
  const range = weekRange(new Date());
  const grouped = await Booking.aggregate([
    { $match: paidMatch({ date: { $gte: range.start, $lte: range.end } }) },
    { $group: { _id: "$date", count: { $sum: 1 }, gmv: { $sum: "$amount" } } },
  ]);
  const byDate = new Map(grouped.map((row) => [row._id, row]));
  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const days = labels.map((label, index) => {
    const date = new Date(range.startDate);
    date.setDate(range.startDate.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const found = byDate.get(key);
    return { label, count: found ? found.count : 0 };
  });
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const gmv = grouped.reduce((sum, row) => sum + row.gmv, 0);
  const peak = days.reduce((best, day) => (day.count > best.count ? day : best), days[0]);
  return {
    days,
    total,
    gmv,
    gmvLabel: formatVnd(gmv),
    peakLabel: peak.count ? `${peak.label} (${peak.count} đơn)` : "Chưa có đơn",
  };
}

async function readSetting() {
  const found = await Setting.findOne({ key: "commission" }).lean();
  return {
    commissionRate: found ? found.commissionRate : 0.05,
    payoutCycle: found ? found.payoutCycle : "weekly",
    minPayout: found ? found.minPayout : 1000000,
  };
}

async function commissionSummary() {
  const setting = await readSetting();
  const [sum] = await Booking.aggregate([
    { $match: paidMatch() },
    { $group: { _id: null, gmv: { $sum: "$amount" } } },
  ]);
  const gmv = sum ? sum.gmv : 0;
  const commission = Math.round(gmv * setting.commissionRate);
  const owners = await commissionByFacility(setting.commissionRate);
  const pending = owners
    .filter((row) => row.commission < setting.minPayout)
    .reduce((total, row) => total + row.commission, 0);
  return {
    gmv,
    gmvLabel: formatVnd(gmv),
    commission,
    commissionLabel: formatVnd(commission),
    pendingCount: owners.filter((row) => row.commission < setting.minPayout).length,
    pendingLabel: formatVnd(pending),
    rate: setting.commissionRate,
    ratePercent: Math.round(setting.commissionRate * 1000) / 10,
    rateLabel: percentLabel(setting.commissionRate),
    cycle: setting.payoutCycle,
    minPayout: setting.minPayout,
    owners,
  };
}

async function commissionByFacility(rate) {
  const rows = await Booking.aggregate([
    { $match: paidMatch() },
    {
      $group: {
        _id: "$facilityName",
        bookings: { $sum: 1 },
        gmv: { $sum: "$amount" },
      },
    },
    { $sort: { gmv: -1 } },
    { $limit: 20 },
  ]);
  return rows.map((row) => {
    const commission = Math.round(row.gmv * rate);
    return {
      facilityName: row._id,
      bookings: row.bookings,
      gmv: row.gmv,
      gmvLabel: formatVnd(row.gmv),
      commission,
      commissionLabel: formatVnd(commission),
    };
  });
}

async function listPayouts() {
  const names = await mongoose.connection.db.listCollections({ name: "payouts" }).toArray();
  if (!names.length) return [];
  const rows = await mongoose.connection
    .collection("payouts")
    .find({})
    .sort({ paidAt: -1 })
    .limit(20)
    .toArray();
  return rows.map((row) => ({
    ownerName: row.ownerName || "—",
    amount: row.amount || 0,
    amountLabel: formatVnd(row.amount || 0),
    paidAt: row.paidAt ? new Date(row.paidAt).toLocaleDateString("vi-VN") : "—",
    note: row.note || "",
  }));
}

async function saveCommission(body) {
  const percent = Number(body.ratePercent);
  const minPayout = Number(body.minPayout);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ServiceError("Tỷ lệ hoa hồng từ 0 đến 100");
  }
  if (!CYCLES.includes(body.cycle)) throw new ServiceError("Chu kỳ không hợp lệ");
  if (!Number.isFinite(minPayout) || minPayout < 0) {
    throw new ServiceError("Hạn mức không hợp lệ");
  }
  await Setting.findOneAndUpdate(
    { key: "commission" },
    {
      key: "commission",
      commissionRate: percent / 100,
      payoutCycle: body.cycle,
      minPayout,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

module.exports = {
  getOverview,
  listActiveVenues,
  listBookings,
  weekActivity,
  commissionSummary,
  listPayouts,
  saveCommission,
};
```

`listPayouts` là chỗ duy nhất còn `listCollections`, vì chưa có model payout. Dashboard không gọi hàm này.

`commissionSummary` gọi `commissionByFacility` một lần rồi vừa trả bảng đối soát, vừa tính số chưa đủ hạn mức. Không aggregate hai lần.

## 4. Sửa `controllers/admin/platform-dashboard.controller.js`

Thay cả file. Controller không cộng tiền. Nó gọi `getOverview`, `weekActivity`, `listBookings(6)`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const statsService = require("../../services/admin/stats.service");

const index = asyncHandler(async (req, res) => {
  try {
    const [stats, week, recent] = await Promise.all([
      statsService.getOverview(),
      statsService.weekActivity(),
      statsService.listBookings(6),
    ]);
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      stats,
      week,
      recent: recent.items,
      loadError: null,
    });
  } catch (error) {
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      stats: null,
      week: null,
      recent: [],
      loadError: "Không đọc được số liệu. Kiểm tra kết nối MongoDB.",
    });
  }
});

module.exports = { index };
```

Ba hàm chạy cùng lúc. Trang không chờ xong bốn số rồi mới hỏi đơn.

## 5. Thay `block main` của `views/admin/pages/platform/dashboard.pug`

Giữ hai dòng đầu `extends` và `include`. Thay từ `block main` đến hết file.

```pug
block main
  +alert-error(5000)
  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Tổng quan sàn
      h1.pf-title Bảng điều khiển Trung tâm
      p.pf-sub Số liệu toàn sàn tại thời điểm này.

  if loadError
    p.sz-empty= loadError
  else
    .pf-stats
      a.pf-stat(href="/admin/users")
        i.bi.bi-people
        span.pf-stat-label Tài khoản
        strong.pf-stat-value= stats.users
        span.pf-stat-note Mở danh sách
      a.pf-stat(href="/admin/users?role=OWNER")
        i.bi.bi-person-badge
        span.pf-stat-label Chủ sân
        strong.pf-stat-value= stats.owners
        span.pf-stat-note Tài khoản đang là chủ sân
      a.pf-stat(href="/admin/venues")
        i.bi.bi-buildings
        span.pf-stat-label Cơ sở đang mở
        strong.pf-stat-value= stats.venues
        span.pf-stat-note Đang nhận khách
      a.pf-stat(href="/admin/bookings")
        i.bi.bi-calendar-check
        span.pf-stat-label Đơn đặt
        strong.pf-stat-value= stats.bookings
        span.pf-stat-note= stats.bookingsExists ? "Có đơn trong hệ thống" : "Chưa có đơn đặt"

    .pf-split
      section.sz-card.sz-panel
        .pf-split-head
          div
            h2.sz-panel-title Lượt đặt trong tuần
            p.sz-panel-sub= week.total + " lượt · " + week.gmvLabel
          span.sz-badge.sz-badge-ok= week.peakLabel
        .pf-bars
          each day in week.days
            .pf-bar
              span.pf-bar-fill(style=`height:${week.total ? Math.max(8, Math.round(day.count / week.total * 100)) : 8}%`)
              small= day.label
              strong= day.count
      section.sz-card.sz-panel
        .pf-split-head
          h2.sz-panel-title Đơn đặt mới nhất
          a(href="/admin/bookings") Xem tất cả
        if recent.length
          each item in recent
            .pf-order
              div
                strong= item.code
                small.sz-muted #{item.facilityName} · #{item.courtName}
              div
                span= item.amountLabel
                small.sz-muted #{item.date} · #{item.time}
        else
          p.sz-empty Chưa có đơn đặt.
```

Chiều cao cột lấy từ `count` của ngày đó so với tổng tuần. Không có đơn thì cột vẫn cao 8% để hàng không biến mất. Con số dưới cột là `day.count`.

## 6. Sửa `views/admin/pages/platform/bookings-readonly.pug`

`listBookings` không còn `payment_status`. Thay `block main`.

```pug
block main
  header.pf-head
    div
      p.pf-kicker Chỉ xem
      h1.pf-title Đơn đặt
      p.pf-sub Danh sách đơn trên toàn sàn. Trang này không sửa đơn.
  section.sz-card.sz-panel
    if items.length
      .table-responsive
        table.sz-table
          thead
            tr
              th Mã
              th Cơ sở
              th Sân
              th Thời gian
              th Tiền
              th Trạng thái
          tbody
            each item in items
              tr
                td= item.code
                td= item.facilityName
                td= item.courtName
                td #{item.date} · #{item.time}
                td= item.amountLabel
                td= item.statusLabel
    else
      p.sz-empty Chưa có đơn đặt.
```

`readonly.controller.js` giữ nguyên lời gọi `listBookings()`. Không truyền limit thì service lấy 50.

## 7. Tạo `controllers/admin/commission.controller.js`

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const statsService = require("../../services/admin/stats.service");
const { ServiceError } = require("../../services/admin/auth.service");

const index = asyncHandler(async (req, res) => {
  const tab = ["reconcile", "history", "config"].includes(req.query.tab)
    ? req.query.tab
    : "config";
  const [summary, payouts] = await Promise.all([
    statsService.commissionSummary(),
    statsService.listPayouts(),
  ]);
  res.render("admin/pages/platform/commissions", {
    pageTitle: "Hoa hồng",
    activeMenu: "commissions",
    tab,
    summary,
    payouts,
  });
});

const save = asyncHandler(async (req, res) => {
  try {
    await statsService.saveCommission(req.body);
    req.flash("success", "Đã lưu cấu hình hoa hồng");
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Không lưu được cấu hình";
    req.flash("error", message);
  }
  return res.redirect("/admin/commissions?tab=config");
});

module.exports = { index, save };
```

Tab lấy từ query `tab`. Không có ba trang riêng.

## 8. Tạo `routes/admin/commission.route.js`

```javascript
const express = require("express");
const controller = require("../../controllers/admin/commission.controller");

const router = express.Router();

router.get("/", controller.index);
router.post("/settings", controller.save);

module.exports = router;
```

## 9. Thêm hai dòng vào `routes/admin/index.route.js`

Cạnh dòng `const userRoutes = require("./user.route");` thêm:

```javascript
const commissionRoutes = require("./commission.route");
```

Cạnh dòng `app.use(PATH + "/users", userRoutes);` thêm:

```javascript
app.use(PATH + "/commissions", commissionRoutes);
```

Không viết lại cả file. Route này nằm dưới `authenticate` và `requireAdmin`, nên khách chưa đăng nhập không vào được.

## 10. Tạo `views/admin/pages/platform/commissions.pug`

```pug
extends ../../../owner/layouts/default.pug
include ../../../mixins/alert.pug

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Hoa hồng
      h1.pf-title Hoa hồng và đối soát chủ sân
      p.pf-sub Số tiền lấy từ đơn đã xác nhận. Tỷ lệ lấy từ cấu hình sàn.

  .pf-stats
    article.pf-stat
      span.pf-stat-label Tổng tiền đơn
      strong.pf-stat-value= summary.gmvLabel
      span.pf-stat-note Đơn upcoming và completed
    article.pf-stat
      span.pf-stat-label Hoa hồng sàn
      strong.pf-stat-value= summary.commissionLabel
      span.pf-stat-note= summary.rateLabel
    article.pf-stat
      span.pf-stat-label Chưa đủ hạn chuyển
      strong.pf-stat-value= summary.pendingLabel
      span.pf-stat-note #{summary.pendingCount} cơ sở dưới hạn mức
    article.pf-stat
      span.pf-stat-label Tỷ lệ đang dùng
      strong.pf-stat-value= summary.rateLabel
      span.pf-stat-note Hạn mức #{summary.minPayout} đ

  nav.pf-tabs
    a(href="/admin/commissions?tab=reconcile" class=tab === "reconcile" ? "active" : undefined) Đối soát chủ sân
    a(href="/admin/commissions?tab=history" class=tab === "history" ? "active" : undefined) Lịch sử chuyển tiền
    a(href="/admin/commissions?tab=config" class=tab === "config" ? "active" : undefined) Cấu hình hoa hồng

  if tab === "reconcile"
    section.sz-card.sz-panel
      if summary.owners.length
        table.sz-table
          thead
            tr
              th Cơ sở
              th Số đơn
              th Tiền đơn
              th Hoa hồng
          tbody
            each row in summary.owners
              tr
                td= row.facilityName
                td= row.bookings
                td= row.gmvLabel
                td= row.commissionLabel
      else
        p.sz-empty Chưa có đơn để đối soát.

  else if tab === "history"
    section.sz-card.sz-panel
      if payouts.length
        table.sz-table
          thead
            tr
              th Chủ sân
              th Số tiền
              th Ngày
              th Ghi chú
          tbody
            each row in payouts
              tr
                td= row.ownerName
                td= row.amountLabel
                td= row.paidAt
                td= row.note
      else
        p.sz-empty Chưa có lần chuyển tiền.

  else
    section.sz-card.sz-panel
      h2.sz-panel-title Cấu hình tỷ lệ
      form(method="post" action="/admin/commissions/settings")
        label Tỷ lệ hoa hồng (%)
        input.sz-input(type="number" name="ratePercent" min="0" max="100" step="0.1" value=summary.ratePercent required)
        p.sz-muted Đang áp dụng #{summary.rateLabel}
        label Chu kỳ
        .pf-cycles
          label
            input(type="radio" name="cycle" value="weekly" checked=summary.cycle === "weekly")
            |  Hàng tuần
          label
            input(type="radio" name="cycle" value="biweekly" checked=summary.cycle === "biweekly")
            |  Hai tuần một lần
          label
            input(type="radio" name="cycle" value="monthly" checked=summary.cycle === "monthly")
            |  Hàng tháng
        label Hạn mức chuyển tối thiểu (đ)
        input.sz-input(type="number" name="minPayout" min="0" step="1000" value=summary.minPayout required)
        button.sz-btn.sz-btn-green(type="submit") Lưu cấu hình
```

Bốn thẻ hoa hồng là `article`, không phải link. Bốn thẻ dashboard vẫn là link.

## 11. Menu admin

Trong `views/owner/partials/sider.pug`, chỉ trong nhánh `if panelRole === "admin"`, ngay sau link Tài khoản, thêm:

```pug
      a.sz-menu-item(href="/admin/commissions" class=(activeMenu === "commissions" ? "active" : undefined))
        i.bi.bi-percent
        span.sz-menu-text Hoa hồng
```

Không thêm Quản lý cơ sở, Đơn đặt, Tài chính vào sidebar trong đợt này. Hai trang cơ sở và đơn vẫn mở từ thẻ trên dashboard.

## 12. CSS thêm vào cuối `public/admin/css/platform.css`

```css
.pf-split {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
  margin-top: 14px;
}
.pf-split-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.pf-bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  align-items: end;
  min-height: 180px;
}
.pf-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 180px;
  justify-content: flex-end;
}
.pf-bar-fill {
  width: 100%;
  max-width: 36px;
  background: #10b981;
  border-radius: 8px 8px 4px 4px;
  min-height: 8px;
}
.pf-order {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
.pf-order small,
.pf-order span {
  display: block;
}
.pf-tabs {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}
.pf-tabs a {
  text-decoration: none;
  font-weight: 700;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
}
.pf-tabs a.active {
  color: #047857;
  border-color: #a7f3d0;
  background: #ecfdf5;
}
.pf-cycles {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
@media (max-width: 991px) {
  .pf-split { grid-template-columns: 1fr; }
}
```

---

## Kiểm tra

1. `/admin/dashboard` bốn số khớp Compass: tổng user, user `role = OWNER`, sân `active` chưa xóa, tổng document `bookings`.
2. Thêm một booking `status: "completed"`, `amount: 200000`, `date` là một ngày trong tuần này. Tải lại dashboard: cột đúng thứ tăng 1, đơn mới hiện mã đó, tiền hiện `200.000 ₫` từ `formatVnd`, không gõ số trong Pug.
3. `/admin/commissions` thẻ hoa hồng là `10.000 ₫` khi tỷ lệ còn 5%. Đổi form thành `10` rồi Lưu. `platform_settings` có `commissionRate: 0.1`. Thẻ thành `20.000 ₫`.
4. Nhập tỷ lệ `120`. Flash lỗi, document không đổi.
5. Tab Đối soát nhóm theo `facilityName`. Tab Lịch sử trống nếu chưa có collection `payouts`.
6. `/admin/bookings` dùng cùng `listBookings`, có cột tiền và trạng thái. Không còn cột `payment_status`.
7. Trang tài khoản vẫn tạo, sửa, đổi vai trò, khóa. Sidebar chủ sân không có mục Hoa hồng.
