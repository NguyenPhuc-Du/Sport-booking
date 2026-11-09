# Super Admin — làm nốt phần còn thiếu

Tài liệu để tự gõ. Không thêm nghiệp vụ ngoài phạm vi dưới đây. Không làm lịch sử đăng nhập.

Web quản trị giữ bốn cửa: Tổng quan, Tài khoản, Sổ cái, Hoa hồng. Bỏ Đơn đặt và Cơ sở. Hoa hồng tự sinh khi đơn đã thanh toán và chỉ được ghi thêm vào sổ cái. Sai thì ghi bút toán điều chỉnh, không sửa và không xóa dòng cũ.

Mọi nhãn dùng chung nằm trong `services/admin/catalog.js`. View chỉ `each` qua mảng đó. Mọi dòng tiền đi qua một hàm `appendLine`.

Ngày trên form dùng giờ máy, hàm `isoDate` trong catalog. Không dùng `toISOString()` để cắt ngày, vì mốc UTC lệch sang ngày hôm trước.

## Phạm vi

| Cửa | Việc |
|---|---|
| Tổng quan | Bốn thẻ: tổng tài khoản (kèm số theo vai trò), tài khoản hoạt động (kèm tài khoản mới tuần/tháng), tổng dòng sổ cái (kèm GMV), hoa hồng tháng này (kèm hoa hồng đã thu). Biểu đồ hoa hồng theo ngày, tuần hoặc tháng. Khối phải là bút toán mới nhất |
| Tài khoản | Giữ danh sách, tìm, lọc, tạo, đổi vai trò, khóa. Tách đặt lại mật khẩu riêng để ghi nhật ký. Thêm trang chi tiết. Chủ sân thấy số đang giữ hộ và công nợ hoa hồng. Không có lịch sử đăng nhập |
| Sổ cái | Mỗi biến động một dòng: thời gian, mã, tài khoản, loại, số tiền, số dư sau. Lọc theo ngày, tài khoản, loại, mã. Xuất CSV. Form điều chỉnh chỉ để ghi thêm |
| Hoa hồng | Tỷ lệ sàn, tỷ lệ riêng từng chủ sân, báo cáo theo kỳ, nút chốt kỳ. Không còn form gõ tên và số tiền |

Năm loại sổ, đúng một mảng `LEDGER_TYPES`: `payment`, `commission`, `refund`, `withdrawal`, `adjustment`.

Cách tiền đi vào số dư sàn:

| Loại | `amount` hiện trên bảng | `effect` cộng vào số dư sàn |
|---|---|---|
| Thanh toán VNPay | Tiền đơn | Cộng tiền đơn. Tiền đã về sàn |
| Thanh toán tiền mặt | Tiền đơn | 0. Tiền nằm ở chủ sân |
| Hoa hồng | Phí sàn | 0. Phí là bút toán ghi nhớ, tiền không đi thêm một lần |
| Hoàn tiền | Tiền đơn | Trừ đúng `effect` của dòng thanh toán gốc |
| Rút tiền | Phần trả chủ sân | Trừ số đó. Sàn chi tiền |
| Điều chỉnh khi chốt hoa hồng tiền mặt | Hoa hồng chủ sân nộp | Cộng số đó |
| Điều chỉnh tay | Số admin nhập, được âm | Cộng đúng số đã nhập |

Đơn VNPay: hoa hồng tính là đã thu ngay khi ghi sổ. Đơn tiền mặt: hoa hồng là công nợ cho đến khi chốt kỳ. Hủy đơn đã ghi sổ thì thêm dòng hoàn tiền và một dòng điều chỉnh âm để gạch hoa hồng, không sửa hai dòng cũ.

`models/user.model.js`, `models/booking.model.js`, `models/facilities.model.js` giữ nguyên. Web chủ sân chỉ thêm ba lời gọi ở mục 16, vì đó là lúc đơn trở thành đã thanh toán hoặc bị hủy. Không sửa màn đặt sân, không thêm nút trên `/owner`.

## File tạo mới

```text
services/admin/catalog.js
services/admin/audit.service.js
services/admin/rate.service.js
services/admin/ledger.service.js
services/admin/commission.service.js
models/ledger-entry.model.js
models/owner-rate.model.js
models/admin-audit.model.js
controllers/admin/ledger.controller.js
routes/admin/ledger.route.js
validates/admin/platform-ledger.validate.js
validates/admin/platform-commission.validate.js
views/admin/pages/platform/ledger.pug
views/admin/pages/platform/user-detail.pug
```

## File thay cả file

```text
services/admin/user.service.js
controllers/admin/user.controller.js
controllers/admin/platform-dashboard.controller.js
controllers/admin/commission.controller.js
routes/admin/user.route.js
routes/admin/commission.route.js
routes/admin/index.route.js
validates/admin/platform-user.validate.js
middlewares/admin/locals.middleware.js
views/admin/pages/platform/dashboard.pug
views/admin/pages/platform/users.pug
views/admin/pages/platform/commissions.pug
```

`views/owner/partials/sider.pug` chỉ thay nhánh `panelRole === "admin"`. Nhánh `else` giữ nguyên.

`public/admin/css/platform.css` chỉ đổi một rule `.pf-bars`.

## File xóa, chỉ của web quản trị

Các file này không còn route, hoặc là trang dữ liệu giả, hoặc được thay bằng sổ cái. Không xóa CSS và JS trong `public/admin` vì web chủ sân đang dùng. Không xóa `validates/admin/voucher.validates.js`.

```text
controllers/admin/readonly.controller.js
controllers/admin/account.controller.js
controllers/admin/courts.controller.js
controllers/admin/platform-permissions.controller.js
routes/admin/readonly.route.js
routes/admin/account.route.js
routes/admin/platform-permissions.route.js
services/admin/stats.service.js
models/payout.model.js
views/admin/pages/platform/bookings-readonly.pug
views/admin/pages/platform/venues-readonly.pug
views/admin/pages/platform/permissions.pug
views/admin/pages/bookings/index.pug
views/admin/pages/accounts/index.pug
views/admin/pages/users/index.pug
```

Xóa `services/admin/stats.service.js` sau khi đã có `ledger.service.js` và `commission.service.js`. Xóa `models/payout.model.js` sau khi không còn `require` tới nó. Collection `payouts` trong Mongo để nguyên, code không đọc nữa.

## File giữ nguyên

```text
controllers/admin/auth.controller.js
services/admin/auth.service.js
services/admin/present.js
routes/admin/auth.route.js
routes/admin/platform-dashboard.route.js
validates/admin/platform-auth.validate.js
middlewares/admin/authenticate.middleware.js
middlewares/admin/require-admin.middleware.js
middlewares/admin/async-handler.js
views/admin/pages/auth/login.pug
public/admin/js/platform.js
models/platform-setting.model.js
models/user.model.js
```

`platform-dashboard.route.js` vẫn là `GET /`. Controller của nó được viết lại, file route không đổi.

---

## 1. `services/admin/catalog.js`

Tạo file mới. Role, trạng thái, loại sổ, chu kỳ, mốc biểu đồ và menu đều lấy từ đây.

```javascript
const ROLES = [
  { code: "ADMIN", label: "Quản trị" },
  { code: "OWNER", label: "Chủ sân" },
  { code: "USER", label: "Khách hàng" },
];

const STATUSES = [
  { code: "active", label: "Hoạt động" },
  { code: "inactive", label: "Đã khóa" },
];

const LEDGER_TYPES = [
  { code: "payment", label: "Thanh toán" },
  { code: "commission", label: "Hoa hồng" },
  { code: "refund", label: "Hoàn tiền" },
  { code: "withdrawal", label: "Rút tiền" },
  { code: "adjustment", label: "Điều chỉnh" },
];

const CYCLES = [
  { code: "weekly", label: "Hàng tuần", days: 7 },
  { code: "biweekly", label: "Hai tuần", days: 14 },
  { code: "monthly", label: "Hàng tháng", days: 30 },
];

const CHARTS = [
  { code: "day", label: "Ngày", buckets: 7, unit: "day" },
  { code: "week", label: "Tuần", buckets: 4, unit: "week" },
  { code: "month", label: "Tháng", buckets: 6, unit: "month" },
];

const ADMIN_MENU = [
  { href: "/admin/dashboard", key: "dashboard", icon: "bi-grid", text: "Tổng quan sàn" },
  { href: "/admin/users", key: "users", icon: "bi-people", text: "Tài khoản" },
  { href: "/admin/ledger", key: "ledger", icon: "bi-journal-text", text: "Sổ cái" },
  { href: "/admin/commissions", key: "commissions", icon: "bi-percent", text: "Hoa hồng" },
];

const AUDIT_ACTIONS = [
  { code: "user.create", label: "Tạo tài khoản" },
  { code: "user.update", label: "Sửa tài khoản" },
  { code: "user.role", label: "Đổi vai trò" },
  { code: "user.status", label: "Khóa hoặc mở khóa" },
  { code: "user.password", label: "Đặt lại mật khẩu" },
  { code: "commission.rate", label: "Đổi tỷ lệ sàn" },
  { code: "commission.ownerRate", label: "Đổi tỷ lệ chủ sân" },
  { code: "commission.close", label: "Chốt kỳ đối soát" },
  { code: "ledger.adjust", label: "Bút toán điều chỉnh" },
];

const ROLE_CODES = ROLES.map((item) => item.code);
const STATUS_CODES = STATUSES.map((item) => item.code);
const LEDGER_CODES = LEDGER_TYPES.map((item) => item.code);
const CYCLE_CODES = CYCLES.map((item) => item.code);
const CHART_CODES = CHARTS.map((item) => item.code);

function byCode(list, code) {
  return list.find((item) => item.code === code) || null;
}

function isoDate(date) {
  const value = new Date(date);
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  return copy;
}

function startOfMonth(date) {
  const copy = startOfDay(date);
  copy.setDate(1);
  return copy;
}

function addUnit(date, unit, amount) {
  const copy = new Date(date);
  if (unit === "day") copy.setDate(copy.getDate() + amount);
  if (unit === "week") copy.setDate(copy.getDate() + amount * 7);
  if (unit === "month") copy.setMonth(copy.getMonth() + amount);
  return copy;
}

module.exports = {
  ROLES,
  STATUSES,
  LEDGER_TYPES,
  CYCLES,
  CHARTS,
  ADMIN_MENU,
  AUDIT_ACTIONS,
  ROLE_CODES,
  STATUS_CODES,
  LEDGER_CODES,
  CYCLE_CODES,
  CHART_CODES,
  byCode,
  isoDate,
  startOfDay,
  startOfWeek,
  startOfMonth,
  addUnit,
};
```

## 2. Ba model

### `models/ledger-entry.model.js`

```javascript
const mongoose = require("mongoose");
const { LEDGER_CODES } = require("../services/admin/catalog");

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: LEDGER_CODES, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    booking_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    booking_code: { type: String, default: "" },
    amount: { type: Number, required: true },
    effect: { type: Number, required: true, default: 0 },
    balance_after: { type: Number, required: true },
    rate: { type: Number, default: null },
    collected: { type: Boolean, default: false },
    settled_booking_ids: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
    },
    note: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

schema.index(
  { booking_id: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: ["payment", "commission", "refund"] },
    },
  },
);
schema.index({ created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ owner_id: 1, created_at: -1 });

module.exports = mongoose.model("LedgerEntry", schema, "ledger_entries");
```

Index unique chặn ghi hai lần thanh toán, hai lần hoa hồng hoặc hai lần hoàn cho cùng một đơn. Dòng điều chỉnh không nằm trong index đó, vì một đơn có thể có một dòng hoàn hoa hồng và về sau không ghi đè.

### `models/owner-rate.model.js`

```javascript
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    commissionRate: { type: Number, required: true, min: 0, max: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OwnerRate", schema, "owner_commission_rates");
```

Không có document thì chủ sân dùng tỷ lệ sàn trong `platform_settings`.

### `models/admin-audit.model.js`

```javascript
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    detail: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

schema.index({ created_at: -1 });
schema.index({ target_id: 1, created_at: -1 });

module.exports = mongoose.model("AdminAudit", schema, "admin_audit_logs");
```

## 3. `services/admin/audit.service.js`

```javascript
const Audit = require("../../models/admin-audit.model");
const { byCode, AUDIT_ACTIONS } = require("./catalog");

async function write(actorId, action, targetId, detail) {
  await Audit.create({
    actor_id: actorId,
    action,
    target_id: targetId || null,
    detail: String(detail || ""),
  });
}

async function list(filter) {
  const rows = await Audit.find(filter || {})
    .populate("actor_id", "fullName email")
    .sort({ created_at: -1 })
    .limit(50)
    .lean();

  return rows.map((row) => {
    const action = byCode(AUDIT_ACTIONS, row.action);
    return {
      when: row.created_at
        ? new Date(row.created_at).toLocaleString("vi-VN")
        : "—",
      actorName: row.actor_id ? row.actor_id.fullName : "—",
      actionLabel: action ? action.label : row.action,
      detail: row.detail || "",
    };
  });
}

module.exports = { write, list };
```

## 4. `services/admin/rate.service.js`

Tách file này để sổ cái gọi được tỷ lệ mà không bị vòng require với báo cáo hoa hồng.

```javascript
const Setting = require("../../models/platform-setting.model");
const OwnerRate = require("../../models/owner-rate.model");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const { percentLabel } = require("./present");
const { CYCLE_CODES } = require("./catalog");

async function readSetting() {
  const found = await Setting.findOne({ key: "commission" }).lean();
  return {
    commissionRate: found ? found.commissionRate : 0.05,
    payoutCycle: found ? found.payoutCycle : "weekly",
    minPayout: found ? found.minPayout : 1000000,
  };
}

async function resolveRate(ownerId) {
  if (ownerId) {
    const own = await OwnerRate.findOne({ user_id: ownerId }).lean();
    if (own && Number.isFinite(own.commissionRate)) return own.commissionRate;
  }
  const setting = await readSetting();
  return setting.commissionRate;
}

async function saveSetting(actorId, body) {
  const percent = Number(body.ratePercent);
  const minPayout = Number(body.minPayout);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ServiceError("Tỷ lệ hoa hồng từ 0 đến 100");
  }
  if (!CYCLE_CODES.includes(body.cycle)) {
    throw new ServiceError("Chu kỳ không hợp lệ");
  }
  if (!Number.isFinite(minPayout) || minPayout < 0) {
    throw new ServiceError("Hạn mức không hợp lệ");
  }

  const before = await readSetting();
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
  await audit.write(
    actorId,
    "commission.rate",
    null,
    `${percentLabel(before.commissionRate)} → ${percent}% · ${body.cycle} · hạn mức ${minPayout}`,
  );
}

async function listOverrides() {
  return OwnerRate.find().populate("user_id", "fullName email").lean();
}

async function saveOwnerRate(actorId, body) {
  const percent = Number(body.ratePercent);
  const user = await User.findOne({ _id: body.userId, role: "OWNER" }).lean();
  if (!user) throw new ServiceError("Chỉ đặt tỷ lệ cho tài khoản chủ sân");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ServiceError("Tỷ lệ hoa hồng từ 0 đến 100");
  }

  await OwnerRate.findOneAndUpdate(
    { user_id: user._id },
    { user_id: user._id, commissionRate: percent / 100 },
    { upsert: true, new: true },
  );
  await audit.write(
    actorId,
    "commission.ownerRate",
    user._id,
    `${user.fullName} · ${percent}%`,
  );
}

module.exports = {
  readSetting,
  resolveRate,
  saveSetting,
  listOverrides,
  saveOwnerRate,
};
```

## 5. `services/admin/ledger.service.js`

Một hàm `appendLine` cho mọi loại. `recordPaidBooking` và `recordRefund` là hai chỗ sinh dòng tự động. `syncPaidBookings` điền các đơn cũ chưa có dòng, gọi khi mở tổng quan hoặc hoa hồng.

```javascript
const User = require("../../models/user.model");
const Venue = require("../../models/facilities.model");
const Booking = require("../../models/booking.model");
const Ledger = require("../../models/ledger-entry.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const rate = require("./rate.service");
const { formatVnd, percentLabel } = require("./present");
const {
  ROLES,
  LEDGER_TYPES,
  LEDGER_CODES,
  CHARTS,
  byCode,
  isoDate,
  startOfDay,
  startOfWeek,
  startOfMonth,
  addUnit,
} = require("./catalog");

const PAID = ["upcoming", "completed"];
const PAGE_SIZE = 12;

function nextCode() {
  return `LG${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
}

function typeLabel(code) {
  const found = byCode(LEDGER_TYPES, code);
  return found ? found.label : code;
}

async function appendLine(input) {
  const latest = await Ledger.findOne()
    .sort({ created_at: -1, _id: -1 })
    .select("balance_after")
    .lean();
  const balance = (latest ? latest.balance_after : 0) + Number(input.effect || 0);
  try {
    return await Ledger.create({
      code: input.code || nextCode(),
      type: input.type,
      user_id: input.user_id || null,
      owner_id: input.owner_id || null,
      booking_id: input.booking_id || null,
      booking_code: input.booking_code || "",
      amount: Number(input.amount) || 0,
      effect: Number(input.effect) || 0,
      balance_after: balance,
      rate: input.rate == null ? null : input.rate,
      collected: Boolean(input.collected),
      settled_booking_ids: input.settled_booking_ids || [],
      note: input.note || "",
      created_at: input.created_at || new Date(),
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Dòng sổ này đã có");
    }
    throw error;
  }
}

async function recordPaidBooking(booking) {
  if (!booking || !booking._id) return;
  const existed = await Ledger.findOne({
    booking_id: booking._id,
    type: "payment",
  })
    .select("_id")
    .lean();
  if (existed) return;

  const venue = booking.facilityId
    ? await Venue.findById(booking.facilityId).select("owner_id").lean()
    : null;
  const ownerId = venue ? venue.owner_id : null;
  const share = await rate.resolveRate(ownerId);
  const amount = Math.round(Number(booking.amount) || 0);
  const fee = Math.round(amount * share);
  const cash = booking.paymentMethod === "cash";
  const when = booking.paidAt ? new Date(booking.paidAt) : new Date();
  const rows = [
    {
      type: "payment",
      user_id: booking.userId || ownerId,
      owner_id: ownerId,
      booking_id: booking._id,
      booking_code: booking.code,
      amount,
      effect: cash ? 0 : amount,
      collected: !cash,
      note: cash ? "Thanh toán tiền mặt tại sân" : "Thanh toán qua nền tảng",
      created_at: when,
    },
    {
      type: "commission",
      user_id: ownerId,
      owner_id: ownerId,
      booking_id: booking._id,
      booking_code: booking.code,
      amount: fee,
      effect: 0,
      rate: share,
      collected: !cash,
      note: `Hoa hồng ${percentLabel(share)}`,
      created_at: new Date(when.getTime() + 1),
    },
  ];

  for (const row of rows) {
    if (row.type === "commission" && !ownerId) continue;
    try {
      await appendLine(row);
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
    }
  }
}

async function recordRefund(booking) {
  if (!booking || !booking._id) return;
  const payment = await Ledger.findOne({
    booking_id: booking._id,
    type: "payment",
  }).lean();
  if (!payment) return;

  const refunded = await Ledger.findOne({
    booking_id: booking._id,
    type: "refund",
  })
    .select("_id")
    .lean();
  if (!refunded) {
    await appendLine({
      type: "refund",
      user_id: payment.user_id,
      owner_id: payment.owner_id,
      booking_id: booking._id,
      booking_code: booking.code || payment.booking_code,
      amount: payment.amount,
      effect: -Number(payment.effect || 0),
      note: "Hoàn tiền do hủy đơn",
    });
  }

  const commission = await Ledger.findOne({
    booking_id: booking._id,
    type: "commission",
  }).lean();
  const reversed = await Ledger.findOne({
    booking_id: booking._id,
    type: "adjustment",
    amount: { $lt: 0 },
  })
    .select("_id")
    .lean();
  if (commission && !reversed) {
    await appendLine({
      type: "adjustment",
      user_id: commission.user_id,
      owner_id: commission.owner_id,
      booking_id: booking._id,
      booking_code: booking.code || commission.booking_code,
      amount: -Number(commission.amount || 0),
      effect: 0,
      note: "Hoàn hoa hồng do hủy đơn",
    });
  }
}

async function syncPaidBookings() {
  const rows = await Booking.find({
    status: { $in: PAID },
    paidAt: { $ne: null },
  })
    .sort({ paidAt: 1 })
    .select("userId facilityId amount paymentMethod code paidAt")
    .lean();

  for (const booking of rows) {
    await recordPaidBooking(booking);
  }
}

function marksOf(lines) {
  const voided = new Set();
  const settled = new Set();
  lines.forEach((row) => {
    if (row.type === "adjustment" && row.booking_id && Number(row.amount) < 0) {
      voided.add(String(row.booking_id));
    }
    (row.settled_booking_ids || []).forEach((id) => settled.add(String(id)));
  });
  return { voided, settled };
}

function isVoid(row, marks) {
  return marks.voided.has(String(row.booking_id || ""));
}

function isSettled(row, marks) {
  return marks.settled.has(String(row.booking_id || ""));
}

function commissionState(row, marks) {
  if (isVoid(row, marks)) return "void";
  if (row.collected || isSettled(row, marks)) return "collected";
  return "open";
}

function readQuery(query) {
  const source = query || {};
  const page = Math.max(parseInt(source.page, 10) || 1, 1);
  const type = LEDGER_CODES.includes(source.type) ? source.type : "";
  const q = String(source.q || "").trim();
  const userId = source.userId || "";
  const from = source.from ? new Date(source.from) : null;
  const to = source.to ? new Date(source.to) : null;
  if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);

  const filter = {};
  if (type) filter.type = type;
  if (q) filter.code = q;
  if (userId) filter.user_id = userId;
  if (from || to) {
    filter.created_at = {};
    if (from && !Number.isNaN(from.getTime())) filter.created_at.$gte = from;
    if (to && !Number.isNaN(to.getTime())) filter.created_at.$lte = to;
  }

  return {
    filter,
    page,
    type,
    q,
    userId,
    from: source.from || "",
    to: source.to || "",
  };
}

function presentRow(row) {
  const account = row.user_id && row.user_id.fullName ? row.user_id.fullName : "—";
  return {
    code: row.code,
    when: row.created_at ? new Date(row.created_at).toLocaleString("vi-VN") : "—",
    account,
    type: row.type,
    typeLabel: typeLabel(row.type),
    amount: row.amount,
    amountLabel: formatVnd(row.amount),
    balanceLabel: formatVnd(row.balance_after),
    note: row.note || row.booking_code || "",
  };
}

async function list(query) {
  const read = readQuery(query);
  const [total, rows, accounts] = await Promise.all([
    Ledger.countDocuments(read.filter),
    Ledger.find(read.filter)
      .populate("user_id", "fullName")
      .sort({ created_at: -1 })
      .skip((read.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    User.find().select("fullName role").sort({ fullName: 1 }).lean(),
  ]);

  return {
    items: rows.map(presentRow),
    total,
    page: read.page,
    pages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
    type: read.type,
    q: read.q,
    userId: read.userId,
    from: read.from,
    to: read.to,
    accounts,
    types: LEDGER_TYPES,
  };
}

async function csv(query) {
  const read = readQuery(query);
  const rows = await Ledger.find(read.filter)
    .populate("user_id", "fullName")
    .sort({ created_at: -1 })
    .lean();
  const header = ["Thời gian", "Mã", "Tài khoản", "Loại", "Số tiền", "Số dư sau", "Ghi chú"];
  const body = rows.map((row) => {
    const item = presentRow(row);
    return [item.when, item.code, item.account, item.typeLabel, item.amount, row.balance_after, item.note];
  });
  const lines = [header, ...body].map((cols) =>
    cols
      .map((value) => {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(","),
  );
  return `\uFEFF${lines.join("\n")}`;
}

async function adjust(actorId, body) {
  const amount = Number(body.amount);
  const note = String(body.note || "").trim();
  if (!Number.isFinite(amount) || amount === 0) {
    throw new ServiceError("Số tiền điều chỉnh phải khác 0");
  }
  if (!note) throw new ServiceError("Nhập lý do điều chỉnh");
  const user = await User.findById(body.userId).lean();
  if (!user) throw new ServiceError("Không có tài khoản này");

  await appendLine({
    type: "adjustment",
    user_id: user._id,
    owner_id: user.role === "OWNER" ? user._id : null,
    amount,
    effect: amount,
    note,
  });
  await audit.write(actorId, "ledger.adjust", user._id, `${amount} · ${note}`);
}

async function ownerPosition(ownerId) {
  const lines = await Ledger.find({ owner_id: ownerId }).lean();
  const extra = await Ledger.find({
    settled_booking_ids: { $in: lines.map((row) => row.booking_id).filter(Boolean) },
  })
    .select("settled_booking_ids type amount booking_id")
    .lean();
  const marks = marksOf([...lines, ...extra]);
  const commissions = lines.filter((row) => row.type === "commission");
  const debt = commissions
    .filter((row) => commissionState(row, marks) === "open")
    .reduce((sum, row) => sum + row.amount, 0);
  const heldIn = lines
    .filter((row) => row.type === "payment")
    .reduce((sum, row) => sum + Number(row.effect || 0), 0);
  const kept = commissions
    .filter((row) => row.collected && !isVoid(row, marks))
    .reduce((sum, row) => sum + row.amount, 0);
  const paidOut = lines
    .filter((row) => row.type === "withdrawal")
    .reduce((sum, row) => sum + row.amount, 0);
  const held = heldIn - kept - paidOut;
  return {
    debt,
    debtLabel: formatVnd(debt),
    held,
    heldLabel: formatVnd(held),
  };
}

async function sumAmount(filter) {
  const [row] = await Ledger.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return row ? row.total : 0;
}

async function dashboard(range) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const roleCounts = await Promise.all(
    ROLES.map((item) => User.countDocuments({ role: item.code })),
  );
  const byRole = ROLES.map((item, index) => ({
    ...item,
    count: roleCounts[index],
  }));
  const [totalUsers, activeUsers, weekNew, monthNew, entries, gmv, monthFee, collected] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      User.countDocuments({ createdAt: { $gte: monthStart } }),
      Ledger.countDocuments(),
      sumAmount({ type: "payment" }),
      sumAmount({ type: "commission", created_at: { $gte: monthStart } }),
      sumAmount({ type: "commission", collected: true }),
    ]);

  const chart = await commissionChart(range);
  const recent = await Ledger.find()
    .populate("user_id", "fullName")
    .sort({ created_at: -1 })
    .limit(8)
    .lean();

  const cards = [
    {
      href: "/admin/users",
      icon: "bi-people",
      label: "Tổng tài khoản",
      value: String(totalUsers),
      note: byRole.map((item) => `${item.label} ${item.count}`).join(" · "),
    },
    {
      href: "/admin/users?status=active",
      icon: "bi-person-check",
      label: "Tài khoản hoạt động",
      value: String(activeUsers),
      note: `Mới tuần này ${weekNew} · tháng này ${monthNew}`,
    },
    {
      href: "/admin/ledger",
      icon: "bi-journal-text",
      label: "Tổng giao dịch",
      value: String(entries),
      note: `GMV ${formatVnd(gmv)}`,
    },
    {
      href: "/admin/commissions",
      icon: "bi-percent",
      label: "Hoa hồng tháng này",
      value: formatVnd(monthFee),
      note: `Đã thu ${formatVnd(collected)}`,
    },
  ];

  return {
    cards,
    chart,
    charts: CHARTS,
    recent: recent.map(presentRow),
  };
}

async function commissionChart(range) {
  const spec = byCode(CHARTS, range) || CHARTS[0];
  const today = startOfDay(new Date());
  const buckets = [];
  for (let index = spec.buckets - 1; index >= 0; index -= 1) {
    const start = addUnit(today, spec.unit, -index);
    buckets.push({
      label:
        spec.unit === "month"
          ? `${start.getMonth() + 1}/${start.getFullYear()}`
          : `${start.getDate()}/${start.getMonth() + 1}`,
      start,
      end: addUnit(start, spec.unit, 1),
      amount: 0,
    });
  }

  const rows = await Ledger.find({
    type: "commission",
    created_at: { $gte: buckets[0].start, $lt: buckets[buckets.length - 1].end },
  })
    .select("amount created_at")
    .lean();

  rows.forEach((row) => {
    const at = new Date(row.created_at).getTime();
    const bucket = buckets.find(
      (item) => at >= item.start.getTime() && at < item.end.getTime(),
    );
    if (bucket) bucket.amount += row.amount;
  });

  const max = buckets.reduce((peak, item) => Math.max(peak, item.amount), 0);
  return {
    code: spec.code,
    totalLabel: formatVnd(buckets.reduce((sum, item) => sum + item.amount, 0)),
    buckets: buckets.map((item) => ({
      label: item.label,
      amount: item.amount,
      amountLabel: formatVnd(item.amount),
      height: max ? Math.max(8, Math.round((item.amount / max) * 100)) : 8,
    })),
  };
}

async function linesForOwner(ownerId, from, to) {
  return Ledger.find({
    owner_id: ownerId,
    created_at: { $gte: from, $lte: to },
    type: { $in: ["payment", "commission"] },
  }).lean();
}

module.exports = {
  appendLine,
  recordPaidBooking,
  recordRefund,
  syncPaidBookings,
  marksOf,
  isVoid,
  isSettled,
  commissionState,
  list,
  csv,
  adjust,
  ownerPosition,
  dashboard,
  linesForOwner,
};
```

`collected` trên thẻ hoa hồng là tổng các dòng hoa hồng ghi `collected: true`, tức phần VNPay. Phần tiền mặt đã chốt kỳ vẫn là đã thu trên báo cáo, vì báo cáo nhìn `settled_booking_ids`. Thẻ tổng quan giữ số đã ghi nhận lúc thanh toán qua sàn. Không cộng thêm một nguồn thứ hai trên thẻ.

## 6. `services/admin/commission.service.js`

```javascript
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const rate = require("./rate.service");
const ledger = require("./ledger.service");
const { formatVnd, percentLabel } = require("./present");
const { CYCLES, byCode, isoDate } = require("./catalog");

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function periodOf(query, cycle) {
  const chosen = byCode(CYCLES, query.cycle) || byCode(CYCLES, cycle) || CYCLES[0];
  if (query.from && query.to) {
    return {
      from: new Date(query.from),
      to: endOfDay(query.to),
      fromInput: query.from,
      toInput: query.to,
      cycle: chosen.code,
    };
  }
  const to = new Date();
  const from = new Date();
  if (chosen.code === "monthly") from.setMonth(from.getMonth() - 1);
  else from.setDate(from.getDate() - chosen.days);
  return {
    from,
    to,
    fromInput: isoDate(from),
    toInput: isoDate(to),
    cycle: chosen.code,
  };
}

async function marksFor(lines) {
  const ids = lines.map((row) => row.booking_id).filter(Boolean);
  if (!ids.length) return ledger.marksOf([]);
  const Ledger = require("../../models/ledger-entry.model");
  const [covers, reversals] = await Promise.all([
    Ledger.find({ settled_booking_ids: { $in: ids } })
      .select("settled_booking_ids")
      .lean(),
    Ledger.find({ type: "adjustment", booking_id: { $in: ids }, amount: { $lt: 0 } })
      .select("type booking_id amount")
      .lean(),
  ]);
  return ledger.marksOf([...covers, ...reversals]);
}

function sumBy(rows, pick) {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

async function report(period) {
  const owners = await User.find({ role: "OWNER" })
    .select("fullName email")
    .sort({ fullName: 1 })
    .lean();

  const rows = [];
  for (const owner of owners) {
    const lines = await ledger.linesForOwner(owner._id, period.from, period.to);
    const marks = await marksFor(lines);
    const payments = lines.filter(
      (row) => row.type === "payment" && !ledger.isVoid(row, marks),
    );
    const commissions = lines.filter((row) => row.type === "commission");
    const alive = commissions.filter((row) => ledger.commissionState(row, marks) !== "void");
    const collected = alive.filter((row) => ledger.commissionState(row, marks) === "collected");
    const open = alive.filter((row) => ledger.commissionState(row, marks) === "open");
    if (!payments.length && !alive.length) continue;

    const rates = [...new Set(alive.map((row) => row.rate).filter((item) => item != null))];
    const revenue = sumBy(payments, (row) => row.amount);
    const fee = sumBy(alive, (row) => row.amount);
    const collectedAmount = sumBy(collected, (row) => row.amount);
    const openAmount = sumBy(open, (row) => row.amount);
    rows.push({
      ownerId: owner._id,
      ownerName: owner.fullName,
      revenue,
      revenueLabel: formatVnd(revenue),
      rateLabel: rates.length === 1 ? percentLabel(rates[0]) : rates.length ? "Nhiều mức" : "—",
      fee,
      feeLabel: formatVnd(fee),
      collectedLabel: formatVnd(collectedAmount),
      openLabel: formatVnd(openAmount),
    });
  }
  return rows;
}

async function page(query) {
  const tab = query.tab === "config" ? "config" : "report";
  const setting = await rate.readSetting();
  const period = periodOf(query, setting.payoutCycle);
  const [rows, owners, overrides] = await Promise.all([
    report(period),
    User.find({ role: "OWNER", status: "active" })
      .select("fullName email")
      .sort({ fullName: 1 })
      .lean(),
    rate.listOverrides(),
  ]);
  return {
    tab,
    setting: {
      ...setting,
      ratePercent: Math.round(setting.commissionRate * 1000) / 10,
      rateLabel: percentLabel(setting.commissionRate),
    },
    period,
    rows,
    owners,
    overrides: overrides.map((row) => ({
      ownerName: row.user_id ? row.user_id.fullName : "Tài khoản không còn",
      rateLabel: percentLabel(row.commissionRate),
    })),
    cycles: CYCLES,
  };
}

function assertMin(amount, minPayout, label) {
  if (amount > 0 && amount < minPayout) {
    throw new ServiceError(`${label} chưa đạt hạn mức chuyển`);
  }
}

async function closePeriod(actorId, body) {
  const owner = await User.findOne({ _id: body.ownerId, role: "OWNER" }).lean();
  if (!owner) throw new ServiceError("Chọn chủ sân");
  const period = periodOf(body, "weekly");
  const setting = await rate.readSetting();
  const lines = await ledger.linesForOwner(owner._id, period.from, period.to);
  const marks = await marksFor(lines);

  const openCash = lines.filter(
    (row) =>
      row.type === "commission" &&
      !row.collected &&
      ledger.commissionState(row, marks) === "open",
  );
  const openVnpay = lines.filter(
    (row) =>
      row.type === "commission" &&
      row.collected &&
      !ledger.isVoid(row, marks) &&
      !ledger.isSettled(row, marks),
  );
  const vnpayIds = new Set(openVnpay.map((row) => String(row.booking_id)));
  const gmv = lines
    .filter((row) => row.type === "payment" && vnpayIds.has(String(row.booking_id)))
    .reduce((sum, row) => sum + Number(row.effect || 0), 0);
  const fee = openVnpay.reduce((sum, row) => sum + row.amount, 0);
  const debt = openCash.reduce((sum, row) => sum + row.amount, 0);
  const payout = gmv - fee;

  if (debt <= 0 && payout <= 0) {
    throw new ServiceError("Kỳ này không còn khoản chưa chốt");
  }
  assertMin(debt, setting.minPayout, "Hoa hồng tiền mặt");
  assertMin(payout, setting.minPayout, "Tiền giữ hộ chủ sân");

  if (debt > 0) {
    await ledger.appendLine({
      type: "adjustment",
      user_id: owner._id,
      owner_id: owner._id,
      amount: debt,
      effect: debt,
      settled_booking_ids: openCash.map((row) => row.booking_id),
      note: `Chốt hoa hồng tiền mặt ${period.fromInput} → ${period.toInput}`,
    });
  }
  if (payout > 0) {
    await ledger.appendLine({
      type: "withdrawal",
      user_id: owner._id,
      owner_id: owner._id,
      amount: payout,
      effect: -payout,
      settled_booking_ids: openVnpay.map((row) => row.booking_id),
      note: `Trả chủ sân phần đã thu qua sàn ${period.fromInput} → ${period.toInput}`,
    });
  }

  await audit.write(
    actorId,
    "commission.close",
    owner._id,
    `${owner.fullName} · nộp ${debt} · trả ${payout} · ${period.fromInput} → ${period.toInput}`,
  );
}

module.exports = { page, closePeriod };
```

Chốt kỳ không sửa dòng hoa hồng cũ. Dòng mới mang `settled_booking_ids`. Lần chốt sau bỏ qua các đơn đã nằm trong mảng đó.

## 7. `services/admin/user.service.js`

Thay cả file. Thêm `detail` và `resetPassword`. `updateProfile` không còn đổi mật khẩu. Mỗi thao tác ghi một dòng nhật ký.

```javascript
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const ledger = require("./ledger.service");
const { ROLE_CODES, STATUS_CODES } = require("./catalog");

const PAGE_SIZE = 8;

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
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
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
  const status = STATUS_CODES.includes(query.status) ? query.status : "";
  const roleCode = ROLE_CODES.includes(query.role) ? query.role : "";

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

async function create(actorId, body) {
  const profile = readProfile(body);
  const role = ROLE_CODES.includes(body.role) ? body.role : "";
  const password = String(body.password || "");
  if (!role) throw new ServiceError("Chọn một vai trò hợp lệ");
  if (password.length < 6) throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");

  const existed = await User.findOne({
    $or: [{ email: profile.email }, { phone: profile.phone }],
  }).lean();
  if (existed) throw new ServiceError("Email hoặc số điện thoại đã có");

  const password_hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      password_hash,
      role,
      status: "active",
    });
    await audit.write(actorId, "user.create", user._id, `${profile.fullName} · ${role}`);
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Email hoặc số điện thoại đã có");
    }
    throw error;
  }
}

async function updateProfile(actorId, targetId, body) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  const profile = readProfile(body);
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
  try {
    await target.save();
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Email hoặc số điện thoại đã có");
    }
    throw error;
  }
  await audit.write(actorId, "user.update", target._id, profile.fullName);
}

async function resetPassword(actorId, targetId, password) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (String(password || "").length < 6) {
    throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");
  }
  const target = await User.findById(targetId);
  if (!target) throw new ServiceError("Không có tài khoản này");
  target.password_hash = await bcrypt.hash(password, 10);
  await target.save();
  await audit.write(actorId, "user.password", target._id, target.fullName);
}

async function changeRole(actorId, targetId, role) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!ROLE_CODES.includes(role)) throw new ServiceError("Không có vai trò này");

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
  await audit.write(actorId, "user.role", targetId, `${target.role} → ${role}`);
}

async function changeStatus(actorId, targetId, status) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!STATUS_CODES.includes(status)) {
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
  await audit.write(
    actorId,
    "user.status",
    targetId,
    status === "inactive" ? "Khóa" : "Mở khóa",
  );
}

async function detail(id) {
  if (!isID(id)) throw new ServiceError("Định danh không hợp lệ");
  const user = await User.findById(id).select("-password_hash").lean();
  if (!user) throw new ServiceError("Không có tài khoản này");
  const position = user.role === "OWNER" ? await ledger.ownerPosition(user._id) : null;
  const audits = await audit.list({ target_id: user._id });
  return { user, position, audits };
}

module.exports = {
  list,
  create,
  updateProfile,
  resetPassword,
  changeRole,
  changeStatus,
  detail,
  escapeRegex,
};
```

`escapeRegex` vẫn export vì không còn chỗ nào trong admin cần nó sau khi xóa `stats.service.js`. Giữ export để khỏi tìm và sửa chỗ khác. Không file nào ngoài admin import hàm này.

## 8. Validate

### `validates/admin/platform-user.validate.js`

Thay cả file. Mảng role và trạng thái lấy từ catalog.

```javascript
const { ROLE_CODES, STATUS_CODES } = require("../../services/admin/catalog");

function back(req, res, message) {
  req.flash("error", message);
  return res.redirect("/admin/users");
}

function assignRole(req, res, next) {
  if (!ROLE_CODES.includes(req.body.role)) return back(req, res, "Chọn một vai trò hợp lệ");
  return next();
}

function changeStatus(req, res, next) {
  if (!STATUS_CODES.includes(req.body.status)) return back(req, res, "Trạng thái không hợp lệ");
  return next();
}

function create(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  if (!fullName || !email || !phone) {
    return back(req, res, "Nhập đủ họ tên, email và số điện thoại");
  }
  if (!ROLE_CODES.includes(req.body.role)) return back(req, res, "Chọn một vai trò hợp lệ");
  if (password.length < 6) return back(req, res, "Mật khẩu tối thiểu 6 ký tự");
  return next();
}

function update(req, res, next) {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  if (!fullName || !email || !phone) {
    return back(req, res, "Nhập đủ họ tên, email và số điện thoại");
  }
  return next();
}

function resetPassword(req, res, next) {
  if (String(req.body.password || "").length < 6) {
    return back(req, res, "Mật khẩu tối thiểu 6 ký tự");
  }
  return next();
}

module.exports = { assignRole, changeStatus, create, update, resetPassword };
```

### `validates/admin/platform-ledger.validate.js`

```javascript
const mongoose = require("mongoose");

function adjust(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
    req.flash("error", "Chọn tài khoản");
    return res.redirect("/admin/ledger");
  }
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    req.flash("error", "Số tiền điều chỉnh phải khác 0");
    return res.redirect("/admin/ledger");
  }
  if (!String(req.body.note || "").trim()) {
    req.flash("error", "Nhập lý do điều chỉnh");
    return res.redirect("/admin/ledger");
  }
  return next();
}

module.exports = { adjust };
```

### `validates/admin/platform-commission.validate.js`

```javascript
const mongoose = require("mongoose");
const { CYCLE_CODES } = require("../../services/admin/catalog");

function save(req, res, next) {
  const percent = Number(req.body.ratePercent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    req.flash("error", "Tỷ lệ hoa hồng từ 0 đến 100");
    return res.redirect("/admin/commissions?tab=config");
  }
  if (!CYCLE_CODES.includes(req.body.cycle)) {
    req.flash("error", "Chu kỳ không hợp lệ");
    return res.redirect("/admin/commissions?tab=config");
  }
  return next();
}

function ownerRate(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
    req.flash("error", "Chọn chủ sân");
    return res.redirect("/admin/commissions?tab=config");
  }
  return next();
}

function close(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.ownerId)) {
    req.flash("error", "Chọn chủ sân");
    return res.redirect("/admin/commissions");
  }
  if (!req.body.from || !req.body.to) {
    req.flash("error", "Chọn kỳ đối soát");
    return res.redirect("/admin/commissions");
  }
  return next();
}

module.exports = { save, ownerRate, close };
```

## 9. Controller

### `controllers/admin/platform-dashboard.controller.js`

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const ledger = require("../../services/admin/ledger.service");
const { CHART_CODES } = require("../../services/admin/catalog");

const index = asyncHandler(async (req, res) => {
  const range = CHART_CODES.includes(req.query.range) ? req.query.range : "day";
  try {
    await ledger.syncPaidBookings();
    const data = await ledger.dashboard(range);
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      ...data,
      loadError: null,
    });
  } catch (error) {
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      cards: [],
      chart: { code: range, totalLabel: "0 ₫", buckets: [] },
      charts: [],
      recent: [],
      loadError: "Không đọc được số liệu. Kiểm tra kết nối MongoDB.",
    });
  }
});

module.exports = { index };
```

### `controllers/admin/user.controller.js`

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const userService = require("../../services/admin/user.service");
const audit = require("../../services/admin/audit.service");
const { ServiceError } = require("../../services/admin/auth.service");
const { ROLES, STATUSES } = require("../../services/admin/catalog");

function fail(req, res, error, to) {
  const message = error instanceof ServiceError ? error.message : "Thao tác thất bại";
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
    await userService.resetPassword(req.user._id, req.params.id, req.body.password);
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
    await userService.changeStatus(req.user._id, req.params.id, req.body.status);
    req.flash(
      "success",
      req.body.status === "inactive" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
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
```

### `controllers/admin/ledger.controller.js`

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const ledger = require("../../services/admin/ledger.service");
const { ServiceError } = require("../../services/admin/auth.service");

const index = asyncHandler(async (req, res) => {
  const data = await ledger.list(req.query);
  res.render("admin/pages/platform/ledger", {
    pageTitle: "Sổ cái",
    activeMenu: "ledger",
    ...data,
  });
});

const exportCsv = asyncHandler(async (req, res) => {
  const file = await ledger.csv(req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=so-cai.csv");
  res.send(file);
});

const adjust = asyncHandler(async (req, res) => {
  try {
    await ledger.adjust(req.user._id, req.body);
    req.flash("success", "Đã ghi bút toán điều chỉnh");
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "Không ghi được bút toán";
    req.flash("error", message);
  }
  return res.redirect("/admin/ledger");
});

module.exports = { index, exportCsv, adjust };
```

### `controllers/admin/commission.controller.js`

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const commission = require("../../services/admin/commission.service");
const ledger = require("../../services/admin/ledger.service");
const rate = require("../../services/admin/rate.service");
const { ServiceError } = require("../../services/admin/auth.service");

function fail(req, res, error, tab) {
  const message = error instanceof ServiceError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect(tab ? `/admin/commissions?tab=${tab}` : "/admin/commissions");
}

const index = asyncHandler(async (req, res) => {
  await ledger.syncPaidBookings();
  const data = await commission.page(req.query);
  res.render("admin/pages/platform/commissions", {
    pageTitle: "Hoa hồng",
    activeMenu: "commissions",
    ...data,
  });
});

const save = asyncHandler(async (req, res) => {
  try {
    await rate.saveSetting(req.user._id, req.body);
    req.flash("success", "Đã lưu cấu hình hoa hồng");
  } catch (error) {
    return fail(req, res, error, "config");
  }
  return res.redirect("/admin/commissions?tab=config");
});

const ownerRate = asyncHandler(async (req, res) => {
  try {
    await rate.saveOwnerRate(req.user._id, req.body);
    req.flash("success", "Đã lưu tỷ lệ riêng");
  } catch (error) {
    return fail(req, res, error, "config");
  }
  return res.redirect("/admin/commissions?tab=config");
});

const close = asyncHandler(async (req, res) => {
  try {
    await commission.closePeriod(req.user._id, req.body);
    req.flash("success", "Đã chốt kỳ");
  } catch (error) {
    return fail(req, res, error);
  }
  const query = new URLSearchParams({
    from: req.body.from,
    to: req.body.to,
    cycle: req.body.cycle || "",
  });
  return res.redirect(`/admin/commissions?${query.toString()}`);
});

module.exports = { index, save, ownerRate, close };
```

## 10. Route

### `routes/admin/user.route.js`

`GET /:id` đặt sau `GET /`.

```javascript
const express = require("express");
const controller = require("../../controllers/admin/user.controller");
const validate = require("../../validates/admin/platform-user.validate");

const router = express.Router();

router.get("/", controller.index);
router.post("/", validate.create, controller.create);
router.get("/:id", controller.detail);
router.post("/:id/roles", validate.assignRole, controller.assignRole);
router.post("/:id/status", validate.changeStatus, controller.changeStatus);
router.post("/:id/password", validate.resetPassword, controller.resetPassword);
router.post("/:id", validate.update, controller.update);

module.exports = router;
```

### `routes/admin/ledger.route.js`

```javascript
const express = require("express");
const controller = require("../../controllers/admin/ledger.controller");
const validate = require("../../validates/admin/platform-ledger.validate");

const router = express.Router();

router.get("/", controller.index);
router.get("/export", controller.exportCsv);
router.post("/adjustments", validate.adjust, controller.adjust);

module.exports = router;
```

`/export` là đường riêng, không trùng `/:id` vì file này không có param.

### `routes/admin/commission.route.js`

```javascript
const express = require("express");
const controller = require("../../controllers/admin/commission.controller");
const validate = require("../../validates/admin/platform-commission.validate");

const router = express.Router();

router.get("/", controller.index);
router.post("/settings", validate.save, controller.save);
router.post("/owner-rates", validate.ownerRate, controller.ownerRate);
router.post("/close", validate.close, controller.close);

module.exports = router;
```

Bỏ `POST /payouts`.

### `routes/admin/index.route.js`

```javascript
const systemConfig = require("../../config/system");
const localsAdmin = require("../../middlewares/admin/locals.middleware");
const authenticate = require("../../middlewares/admin/authenticate.middleware");
const requireAdmin = require("../../middlewares/admin/require-admin.middleware");

const authRoutes = require("./auth.route");
const dashboardRoutes = require("./platform-dashboard.route");
const userRoutes = require("./user.route");
const commissionRoutes = require("./commission.route");
const ledgerRoutes = require("./ledger.route");

module.exports = (app) => {
  const PATH = systemConfig.prefixAdmin;

  app.use(PATH, localsAdmin);
  app.use(PATH + "/auth", authRoutes);
  app.use(PATH, authenticate, requireAdmin);

  app.get(PATH, (req, res) => res.redirect(PATH + "/dashboard"));
  app.use(PATH + "/dashboard", dashboardRoutes);
  app.use(PATH + "/users", userRoutes);
  app.use(PATH + "/ledger", ledgerRoutes);
  app.use(PATH + "/commissions", commissionRoutes);
};
```

Không gắn `readonly.route.js`, `account.route.js`, `platform-permissions.route.js`.

### `middlewares/admin/locals.middleware.js`

```javascript
const systemConfig = require("../../config/system");
const { ADMIN_MENU } = require("../../services/admin/catalog");

module.exports = (req, res, next) => {
  res.locals.prefixAdmin = systemConfig.prefixAdmin;
  res.locals.prefixOwner = systemConfig.prefixOwner;
  res.locals.panelRole = "admin";
  res.locals.panelHome = systemConfig.prefixAdmin + "/dashboard";
  res.locals.adminMenu = ADMIN_MENU;
  next();
};
```

## 11. Menu

Trong `views/owner/partials/sider.pug`, thay đúng khối `if panelRole === "admin"` bằng đoạn dưới. Giữ nguyên nhánh `else`.

```pug
if panelRole === "admin"
  .sz-facility
    .d-flex.justify-content-between.align-items-center
      small.sz-facility-label NỀN TẢNG SPORTZONE
      span.sz-dot-green(aria-hidden="true")
    .sz-facility-name Admin Console
    .sz-facility-plan
      i.bi.bi-shield-lock
      |  Quản trị hệ thống
  .sz-menu-title PHÂN HỆ QUẢN TRỊ
  nav.sz-menu(aria-label="Menu quản trị")
    each item in adminMenu
      a.sz-menu-item(href=item.href class=(activeMenu === item.key ? "active" : undefined))
        i.bi(class=item.icon)
        span.sz-menu-text= item.text
  .sz-sidebar-bottom
    .sz-copy Hệ thống SportZone
```

Xóa luôn đoạn menu cũ đang bị comment trong nhánh admin.

## 12. CSS

Trong `public/admin/css/platform.css`, tìm rule:

```css
.pf-bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  align-items: end;
  min-height: 180px;
}
```

Đổi `grid-template-columns` thành:

```css
grid-template-columns: repeat(auto-fit, minmax(36px, 1fr));
```

Bảy cột, bốn cột tuần và sáu cột tháng dùng chung một rule.

## 13. `views/admin/pages/platform/dashboard.pug`

Thay cả file.

```pug
extends ../../../owner/layouts/default.pug
include ../../../mixins/alert.pug

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
      each card in cards
        a.pf-stat(href=card.href)
          i.bi(class=card.icon)
          span.pf-stat-label= card.label
          strong.pf-stat-value= card.value
          span.pf-stat-note= card.note

    .pf-split
      section.sz-card.sz-panel
        .pf-split-head
          div
            h2.sz-panel-title Hoa hồng theo kỳ
            p.sz-panel-sub= chart.totalLabel
          nav.pf-tabs
            each item in charts
              a(href=`/admin/dashboard?range=${item.code}` class=chart.code === item.code ? "active" : undefined)= item.label
        .pf-bars
          each day in chart.buckets
            .pf-bar
              span.pf-bar-fill(style=`height:${day.height}%`)
              small= day.label
              strong= day.amountLabel
      section.sz-card.sz-panel
        .pf-split-head
          h2.sz-panel-title Bút toán sổ cái mới nhất
          a(href="/admin/ledger") Xem sổ cái
        if recent.length
          each item in recent
            a.pf-order(href=`/admin/ledger?q=${item.code}`)
              div
                strong= item.code
                small.sz-muted #{item.typeLabel} · #{item.account}
              div
                span= item.amountLabel
                small.sz-muted= item.when
        else
          p.sz-empty Chưa có bút toán.
```

## 14. `views/admin/pages/platform/users.pug`

Thay cả file. Ô lọc và hộp thoại lấy option từ `roles` và `statuses`. Mật khẩu nằm ở hộp riêng. Tab Nhật ký là audit, không phải lịch sử đăng nhập.

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
    if tab === "users"
      button.sz-btn.sz-btn-green(type="button" data-open="dialog-create") Thêm tài khoản mới

  nav.pf-tabs
    a(href="/admin/users" class=tab === "users" ? "active" : undefined) Danh sách
    a(href="/admin/users?tab=audit" class=tab === "audit" ? "active" : undefined) Nhật ký thao tác

  if tab === "audit"
    section.sz-card.sz-panel
      if audits.length
        .table-responsive
          table.sz-table.pf-table
            thead
              tr
                th Thời gian
                th Người thực hiện
                th Việc
                th Chi tiết
            tbody
              each row in audits
                tr
                  td= row.when
                  td= row.actorName
                  td= row.actionLabel
                  td= row.detail
      else
        .pf-empty
          strong Chưa có thao tác
          p Khóa tài khoản, đổi vai trò hoặc đổi tỷ lệ sẽ hiện ở đây.

  else
    form.pf-filters(method="get" action="/admin/users")
      input.sz-input(type="search" name="q" value=q placeholder="Tìm theo tên, email hoặc số điện thoại")
      select.sz-select(name="role")
        option(value="" selected=!role) Tất cả vai trò
        each item in roles
          option(value=item.code selected=role === item.code) #{item.code} · #{item.label}
      select.sz-select(name="status")
        option(value="" selected=!status) Tất cả trạng thái
        each item in statuses
          option(value=item.code selected=status === item.code)= item.label
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
                - const roleItem = roles.find((item) => item.code === u.role)
                - const nextStatus = u.status === "active" ? "inactive" : "active"
                tr
                  td
                    .pf-person
                      span.pf-avatar= initials.toUpperCase()
                      div
                        a(href=`/admin/users/${u._id}`)
                          strong= u.fullName
                        small.sz-muted= String(u._id).slice(-6).toUpperCase()
                  td
                    div= u.email
                    small.sz-muted= u.phone
                  td
                    span.sz-role(class=`role-${String(u.role || "user").toLowerCase()}`)= u.role
                    small.sz-muted  #{roleItem ? roleItem.label : ""}
                  td
                    if u.status === "active"
                      span.sz-badge.sz-badge-ok Hoạt động
                    else
                      span.sz-badge.sz-badge-danger Đã khóa
                  td= u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "—"
                  td
                    .pf-actions
                      a.sz-btn.sz-btn-sm(href=`/admin/users/${u._id}`) Xem
                      button.sz-btn.sz-btn-sm(type="button" data-open=`edit-${u._id}`) Sửa
                      button.sz-btn.sz-btn-sm(type="button" data-open=`role-${u._id}`) Đổi vai trò
                      button.sz-btn.sz-btn-sm(type="button" data-open=`pass-${u._id}`) Mật khẩu
                      form(method="post" action=`/admin/users/${u._id}/status` data-confirm=u.status === "active" ? `Khóa đăng nhập của ${u.fullName}?` : `Mở khóa ${u.fullName}?`)
                        input(type="hidden" name="status" value=nextStatus)
                        button.sz-btn.sz-btn-sm(type="submit" class=u.status === "active" ? "sz-btn-outline-danger" : "sz-btn-green")
                          = u.status === "active" ? "Khóa" : "Mở khóa"

                dialog.pf-dialog(id=`edit-${u._id}`)
                  form(method="post" action=`/admin/users/${u._id}`)
                    .pf-dialog-head
                      h2 Sửa thông tin
                      button(type="button" data-close aria-label="Đóng") ×
                    label Họ và tên
                    input.sz-input(type="text" name="fullName" value=u.fullName required)
                    label Email
                    input.sz-input(type="email" name="email" value=u.email required)
                    label Số điện thoại
                    input.sz-input(type="text" name="phone" value=u.phone required)
                    .pf-dialog-actions
                      button.sz-btn(type="button" data-close) Hủy
                      button.sz-btn.sz-btn-green(type="submit") Lưu

                dialog.pf-dialog(id=`pass-${u._id}`)
                  form(method="post" action=`/admin/users/${u._id}/password`)
                    .pf-dialog-head
                      h2 Đặt lại mật khẩu
                      button(type="button" data-close aria-label="Đóng") ×
                    p.sz-muted= u.fullName
                    label Mật khẩu mới
                    input.sz-input(type="password" name="password" required minlength="6" autocomplete="new-password")
                    .pf-dialog-actions
                      button.sz-btn(type="button" data-close) Hủy
                      button.sz-btn.sz-btn-green(type="submit") Lưu mật khẩu

                dialog.pf-dialog(id=`role-${u._id}`)
                  form(method="post" action=`/admin/users/${u._id}/roles`)
                    .pf-dialog-head
                      h2 Thay đổi vai trò
                      button(type="button" data-close aria-label="Đóng") ×
                    p
                      strong= u.fullName
                      br
                      span.sz-muted #{u.email} · #{u.phone}
                    each item in roles
                      label.pf-choice
                        input(type="radio" name="role" value=item.code checked=u.role === item.code required)
                        span
                          strong= item.code
                          small= item.label
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
          each item in roles
            option(value=item.code selected=item.code === "USER") #{item.code} · #{item.label}
        .pf-dialog-actions
          button.sz-btn(type="button" data-close) Hủy
          button.sz-btn.sz-btn-green(type="submit") Tạo tài khoản

block script
  script(src="/admin/js/platform.js")
```

## 15. `views/admin/pages/platform/user-detail.pug`

Tạo file mới. Không có mục lịch sử đăng nhập.

```pug
extends ../../../owner/layouts/default.pug
include ../../../mixins/alert.pug

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Tài khoản
      h1.pf-title= user.fullName
      p.pf-sub #{user.email} · #{user.phone}
    a.sz-btn(href="/admin/users") Về danh sách

  .pf-stats
    .pf-stat
      span.pf-stat-label Vai trò
      - const roleItem = roles.find((item) => item.code === user.role)
      strong.pf-stat-value= user.role
      span.pf-stat-note= roleItem ? roleItem.label : ""
    .pf-stat
      span.pf-stat-label Trạng thái
      strong.pf-stat-value= user.status === "active" ? "Hoạt động" : "Đã khóa"
      span.pf-stat-note= user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : ""
    if position
      .pf-stat
        span.pf-stat-label Tiền sàn đang giữ hộ
        strong.pf-stat-value= position.heldLabel
        span.pf-stat-note Phần VNPay chưa trả chủ sân
      .pf-stat
        span.pf-stat-label Công nợ hoa hồng
        strong.pf-stat-value= position.debtLabel
        span.pf-stat-note Hoa hồng tiền mặt chưa chốt

  section.sz-card.sz-panel
    h2.sz-panel-title Nhật ký trên tài khoản này
    if audits.length
      table.sz-table.pf-table
        thead
          tr
            th Thời gian
            th Người thực hiện
            th Việc
            th Chi tiết
        tbody
          each row in audits
            tr
              td= row.when
              td= row.actorName
              td= row.actionLabel
              td= row.detail
    else
      p.sz-empty Chưa có thao tác trên tài khoản này.
```

Khách và admin không có `position`, nên hai thẻ tiền không hiện. Chủ sân có đủ bốn thẻ.

## 16. `views/admin/pages/platform/ledger.pug`

Tạo file mới. Bảng không có nút sửa hoặc xóa.

```pug
extends ../../../owner/layouts/default.pug
include ../../../mixins/alert.pug

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Sổ cái
      h1.pf-title Sổ cái nền tảng
      p.pf-sub Mỗi dòng chỉ ghi thêm. Sai thì lập bút toán điều chỉnh.

  form.pf-filters(method="get" action="/admin/ledger")
    input.sz-input(type="search" name="q" value=q placeholder="Mã giao dịch")
    select.sz-select(name="userId")
      option(value="" selected=!userId) Mọi tài khoản
      each account in accounts
        option(value=account._id selected=String(userId) === String(account._id))= account.fullName
    select.sz-select(name="type")
      option(value="" selected=!type) Mọi loại
      each item in types
        option(value=item.code selected=type === item.code)= item.label
    input.sz-input(type="date" name="from" value=from)
    input.sz-input(type="date" name="to" value=to)
    button.sz-btn.sz-btn-dark(type="submit") Lọc
    a.sz-btn(href=`/admin/ledger/export?q=${encodeURIComponent(q)}&userId=${userId}&type=${type}&from=${from}&to=${to}`) Xuất CSV

  .pf-split
    section.sz-card.sz-panel
      if items.length
        .table-responsive
          table.sz-table.pf-table
            thead
              tr
                th Thời gian
                th Mã
                th Tài khoản
                th Loại
                th.pf-num Số tiền
                th.pf-num Số dư sau
                th Ghi chú
            tbody
              each row in items
                tr
                  td= row.when
                  td
                    strong= row.code
                  td= row.account
                  td= row.typeLabel
                  td.pf-num= row.amountLabel
                  td.pf-num= row.balanceLabel
                  td= row.note
        nav.pf-pager
          - const query = `q=${encodeURIComponent(q)}&userId=${userId}&type=${type}&from=${from}&to=${to}`
          if page > 1
            a(href=`/admin/ledger?page=${page - 1}&${query}`) Trước
          span Trang #{page} / #{pages} · #{total} dòng
          if page < pages
            a(href=`/admin/ledger?page=${page + 1}&${query}`) Sau
      else
        .pf-empty
          strong Chưa có dòng sổ
          p Đơn đã thanh toán sẽ tự ghi khi mở Tổng quan, hoặc khi có thanh toán mới.

    section.sz-card.sz-panel
      h2.sz-panel-title Bút toán điều chỉnh
      p.sz-panel-sub Số dương là tiền vào sàn. Số âm là tiền ra. Dòng đã ghi không sửa được.
      form.pf-form(method="post" action="/admin/ledger/adjustments")
        label.pf-field Tài khoản
        select.sz-select(name="userId" required)
          option(value="") Chọn tài khoản
          each account in accounts
            option(value=account._id)= account.fullName
        label.pf-field Số tiền
        input.sz-input(type="number" name="amount" step="1000" required placeholder="Ví dụ: 50000 hoặc -50000")
        label.pf-field Lý do
        input.sz-input(type="text" name="note" required placeholder="Lý do điều chỉnh")
        button.sz-btn.sz-btn-green(type="submit") Ghi điều chỉnh
```

Class `pf-form` và `pf-field` chưa có trong `platform.css`. Thêm vào cuối file CSS:

```css
.pf-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}
```

## 17. `views/admin/pages/platform/commissions.pug`

Thay cả file. Không còn tab lịch sử chuyển tiền và không còn form gõ tên chủ sân.

```pug
extends ../../../owner/layouts/default.pug
include ../../../mixins/alert.pug

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    div
      p.pf-kicker Quản trị hệ thống / Hoa hồng
      h1.pf-title Hoa hồng và đối soát
      p.pf-sub Tỷ lệ đang bán #{setting.rateLabel}. Hoa hồng của đơn đã ghi không đổi khi sửa tỷ lệ.

  nav.pf-tabs
    a(href=`/admin/commissions?from=${period.fromInput}&to=${period.toInput}&cycle=${period.cycle}` class=tab === "report" ? "active" : undefined) Báo cáo kỳ
    a(href="/admin/commissions?tab=config" class=tab === "config" ? "active" : undefined) Cấu hình

  if tab === "config"
    .pf-split
      section.sz-card.sz-panel
        h2.sz-panel-title Tỷ lệ toàn sàn
        form.pf-form(method="post" action="/admin/commissions/settings")
          label.pf-field Tỷ lệ hoa hồng (%)
          input.sz-input(type="number" name="ratePercent" min="0" max="100" step="0.1" value=setting.ratePercent required)
          p.sz-muted Đang áp dụng #{setting.rateLabel}
          span.pf-field Chu kỳ đối soát
          .pf-cycles
            each item in cycles
              label
                input(type="radio" name="cycle" value=item.code checked=setting.payoutCycle === item.code)
                |  #{item.label}
          label.pf-field Hạn mức chuyển tối thiểu (đ)
          input.sz-input(type="number" name="minPayout" min="0" step="1000" value=setting.minPayout required)
          button.sz-btn.sz-btn-green(type="submit") Lưu cấu hình

      section.sz-card.sz-panel
        h2.sz-panel-title Tỷ lệ riêng chủ sân
        form.pf-form(method="post" action="/admin/commissions/owner-rates")
          label.pf-field Chủ sân
          select.sz-select(name="userId" required)
            option(value="") Chọn chủ sân
            each owner in owners
              option(value=owner._id) #{owner.fullName} — #{owner.email}
          label.pf-field Tỷ lệ (%)
          input.sz-input(type="number" name="ratePercent" min="0" max="100" step="0.1" required)
          button.sz-btn.sz-btn-dark(type="submit") Lưu tỷ lệ riêng
        if overrides.length
          table.sz-table.pf-table
            thead
              tr
                th Chủ sân
                th Tỷ lệ
            tbody
              each row in overrides
                tr
                  td= row.ownerName
                  td= row.rateLabel
        else
          p.sz-muted Chủ sân chưa có tỷ lệ riêng thì dùng tỷ lệ sàn.

  else
    form.pf-filters(method="get" action="/admin/commissions")
      input(type="hidden" name="tab" value="report")
      select.sz-select(name="cycle")
        each item in cycles
          option(value=item.code selected=period.cycle === item.code)= item.label
      input.sz-input(type="date" name="from" value=period.fromInput)
      input.sz-input(type="date" name="to" value=period.toInput)
      button.sz-btn.sz-btn-dark(type="submit") Xem kỳ

    section.sz-card.sz-panel
      if rows.length
        .table-responsive
          table.sz-table.pf-table
            thead
              tr
                th Chủ sân
                th.pf-num Doanh thu
                th Tỷ lệ
                th.pf-num Hoa hồng
                th.pf-num Đã thu
                th.pf-num Chưa thu
                th
            tbody
              each row in rows
                tr
                  td= row.ownerName
                  td.pf-num= row.revenueLabel
                  td= row.rateLabel
                  td.pf-num= row.feeLabel
                  td.pf-num= row.collectedLabel
                  td.pf-num= row.openLabel
                  td
                    form(method="post" action="/admin/commissions/close" data-confirm=`Chốt kỳ của ${row.ownerName}?`)
                      input(type="hidden" name="ownerId" value=row.ownerId)
                      input(type="hidden" name="from" value=period.fromInput)
                      input(type="hidden" name="to" value=period.toInput)
                      input(type="hidden" name="cycle" value=period.cycle)
                      button.sz-btn.sz-btn-green.sz-btn-sm(type="submit") Chốt kỳ
      else
        .pf-empty
          strong Chưa có hoa hồng trong kỳ
          p Khi có đơn đã thanh toán, tải lại trang này.

block script
  script(src="/admin/js/platform.js")
```

## 18. Ba lời gọi ngoài web quản trị

Chỉ thêm lời gọi. Không đổi điều kiện đặt sân, giá, hay trạng thái đơn.

### `services/app/payment.service.js`

Thêm một dòng require cạnh các require sẵn:

```javascript
const ledger = require("../admin/ledger.service");
```

Trong `markPaidAndMail`, ngay sau khi cập nhật voucher và trước khi gửi mail, thêm:

```javascript
  try {
    await ledger.recordPaidBooking(booking);
  } catch (error) {
    console.error(error);
  }
```

Lỗi sổ cái không được làm hỏng thanh toán. `syncPaidBookings` sẽ ghi lại khi admin mở Tổng quan.

### `services/owner/booking.service.js`

Thêm require:

```javascript
const ledger = require("../admin/ledger.service");
```

Trong `createWalkIn`, chỗ `await Booking.create({ ... })` đổi thành gán biến, rồi gọi sổ:

```javascript
    const booking = await Booking.create({
      ...(user ? { userId: user._id } : {}),
      guestName: customer,
      guestPhone: phone,
      code: `SPZ${Date.now()}`,
      status: "upcoming",
      statusLabel: "SẮP DIỄN RA",
      facilityId: court.venue_id,
      facilityName: venue ? venue.name : "",
      courtId: court._id,
      courtName: court.name,
      date,
      timeStart,
      timeEnd,
      time: `${timeStart} - ${timeEnd}`,
      courtPrice: amount,
      discount: 0,
      amount,
      paymentMethod: body.paymentMethod === "cash" ? "cash" : "vnpay",
      paidAt: new Date(),
      bookedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
    });
    try {
      await ledger.recordPaidBooking(booking);
    } catch (error) {
      console.error(error);
    }
```

Các field trong `Booking.create` giữ đúng như file đang có. Chỉ thêm biến `booking` và khối `try`.

Hàm `cancel` thay cả hàm bằng:

```javascript
async function cancel(ownerId, code) {
  const venueIds = (await ownerVenues(ownerId)).map((venue) => venue._id);
  const booking = await Booking.findOne({
    code,
    facilityId: { $in: venueIds },
    status: { $in: ["pending_payment", "upcoming", "completed"] },
  });
  if (!booking) return { matchedCount: 0 };
  const result = await Booking.updateOne(
    { _id: booking._id },
    { $set: { status: "cancelled", statusLabel: "ĐÃ HỦY" } },
  );
  try {
    await ledger.recordRefund(booking);
  } catch (error) {
    console.error(error);
  }
  return result;
}
```

Đơn `pending_payment` chưa có dòng thanh toán thì `recordRefund` trả về ngay, không ghi gì.

## 19. Thứ tự gõ

1. `catalog.js`, ba model, `audit.service.js`, `rate.service.js`.
2. `ledger.service.js` rồi `commission.service.js`.
3. Viết lại `user.service.js` và ba file validate.
4. Bốn controller và các route, kể cả `index.route.js` và `locals.middleware.js`.
5. Sửa nhánh admin của sider, hai rule CSS, năm file pug.
6. Thêm ba lời gọi ở mục 18.
7. Xóa danh sách file ở đầu tài liệu.
8. Mở `/admin/dashboard`. Đơn cũ có `paidAt` sẽ được ghi sổ một lần. Mở lại thì không nhân đôi, vì đã có dòng `payment` của đơn đó.

## 20. Kiểm tra

1. Menu admin còn bốn mục. `/admin/bookings` và `/admin/venues` không còn route.
2. Bốn thẻ tổng quan không còn cơ sở và số đơn. Biểu đồ đổi Ngày / Tuần / Tháng thì cột và tổng đổi theo hoa hồng.
3. Khối phải là mã `LG...`. Bấm một dòng thì `/admin/ledger?q=` lọc đúng mã đó.
4. Tạo tài khoản, sửa hồ sơ, đặt lại mật khẩu, đổi vai trò, khóa. Tab Nhật ký có người thực hiện và việc. Trang chi tiết chủ sân có tiền giữ hộ và công nợ. Không có mục đăng nhập.
5. Tự khóa mình, tự bỏ ADMIN của mình, hoặc hạ admin cuối cùng thì bị từ chối và sổ cái không phát sinh dòng.
6. Một đơn VNPay tạo một dòng thanh toán effect dương và một dòng hoa hồng effect 0, `collected` true. Cùng đơn không tạo thêm lần hai.
7. Một đơn tiền mặt có effect thanh toán bằng 0 và hoa hồng chưa thu. Chốt kỳ đủ hạn mức thì thêm một dòng điều chỉnh, công nợ trên trang chi tiết giảm. Chốt lần hai thì báo không còn khoản.
8. Hạn mức chưa đạt thì không có dòng mới.
9. Đổi tỷ lệ sàn xong, đơn cũ giữ số hoa hồng cũ. Đơn thanh toán sau dùng tỷ lệ mới. Chủ sân có tỷ lệ riêng thì dùng tỷ lệ riêng.
10. Hủy đơn đã thanh toán thêm dòng hoàn tiền. Dòng thanh toán cũ vẫn còn trên bảng.
11. Xuất CSV tôn trọng đúng bộ lọc đang mở. File mở được bằng Excel nhờ BOM đầu file.
12. Form điều chỉnh ghi thêm một dòng. Bảng sổ cái không có nút xóa.
