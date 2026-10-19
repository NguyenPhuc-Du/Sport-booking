# Code web quản trị hệ thống — làm từ A đến Z

File này chỉ để đọc. Chưa có dòng code nào trong repo bị sửa.

Phạm vi: web `/admin`, role `ADMIN`. Không sửa web chủ sân (`/owner`), không sửa app người dùng (`/`).

`docs/quan-tri-he-thong.md` là hợp đồng collection Mongo. File này là cách gõ code.

## Cây thư mục đúng của repo này

Project đang tách theo bề mặt web, không theo thư mục `modules/platform`. Web quản trị dùng các thư mục đã có: `config`, `models`, `middlewares/admin`, `validates/admin`, `controllers/admin`, `routes/admin`, `views/admin`, `public/admin`.

Tầng service và repository thêm song song với `controllers/admin`, vì layered architecture cần hai tầng đó và repo chưa có chỗ nào khác để đặt.

```text
config/platform-permissions.js

middlewares/admin/app-error.js
middlewares/admin/async-handler.js
middlewares/admin/authenticate.middleware.js
middlewares/admin/require-platform-admin.middleware.js
middlewares/admin/authorize.middleware.js

models/subscription-plan.model.js
models/owner-subscription.model.js
models/platform-transaction.model.js

repositories/admin/role.repository.js
repositories/admin/user.repository.js
repositories/admin/plan.repository.js
repositories/admin/subscription.repository.js
repositories/admin/venue.repository.js
repositories/admin/booking.repository.js
repositories/admin/commission.repository.js

services/admin/present.js
services/admin/auth.service.js
services/admin/user.service.js
services/admin/plan.service.js
services/admin/subscription.service.js
services/admin/venue.service.js
services/admin/commission.service.js

validates/admin/platform-auth.validate.js
validates/admin/platform-user.validate.js
validates/admin/platform-plan.validate.js
validates/admin/platform-subscription.validate.js

controllers/admin/auth.controller.js                      (viết lại)
controllers/admin/platform-dashboard.controller.js        (viết lại)
controllers/admin/user.controller.js                      (viết lại)
controllers/admin/plan.controller.js
controllers/admin/subscription.controller.js
controllers/admin/venue.controller.js

routes/admin/auth.route.js                                (viết lại)
routes/admin/platform-dashboard.route.js                  (viết lại)
routes/admin/user.route.js                                (viết lại)
routes/admin/plan.route.js
routes/admin/subscription.route.js
routes/admin/venue.route.js
routes/admin/index.route.js                               (viết lại — làm sau cùng)

views/admin/pages/platform/dashboard.pug                  (viết lại)
views/admin/pages/platform/users.pug
views/admin/pages/platform/plans.pug
views/admin/pages/platform/subscriptions.pug
views/admin/pages/platform/venues.pug
views/admin/pages/auth/login.pug                          (sửa 2 chỗ)
views/admin/partials/sider.pug                            (chỉ nhánh admin)
views/admin/partials/header.pug                           (chỉ nhánh admin)

public/admin/css/platform.css
public/admin/js/platform.js
scripts/seed-platform.js
```

Không tạo `modules/`, `shared/`, `validators/`. Repo gọi thư mục kiểm tra form là `validates`.

Không sửa: `index.js` gốc, `routes/client`, `routes/owner`, `controllers/client`, `controllers/admin/facility.controller.js`, `booking.controller.js`, `finance.controller.js`, `dashboard.controller.js`, `owner-profile.controller.js`, mọi file trong `views/client`, nhánh `else` của sider và header (đó là giao diện chủ sân).

Cookie của web này tên `platform_access_token`, `path: "/admin"`. Trình duyệt không gửi cookie này sang `/` hay `/owner`.

Quyền vào cổng đọc `user_roles` + `roles.code`. Không đọc `users.role`. Schema user vẫn bắt buộc field `role`, nên script seed ghi `ADMIN` cho document hợp lệ. Cổng đăng nhập không dùng field đó.

Luồng một request:

```text
routes/admin → authenticate → requirePlatformAdmin → authorize(quyền) → validate → controller → service → repository → MongoDB
```

Controller không gọi Mongoose. Service không đọc `req`/`res`. Repository không biết tên trang.

Gõ đúng thứ tự bên dưới. Bước gắn `routes/admin/index.route.js` nằm sau khi view đã có, nếu không trang sẽ render một file Pug chưa tồn tại.

---

## Bước 1 — `middlewares/admin/app-error.js`

Service ném lỗi này khi luật nghiệp vụ thất bại.

```javascript
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
```

## Bước 2 — `middlewares/admin/async-handler.js`

Bọc controller async để lỗi rơi xuống Express.

```javascript
module.exports = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
```

## Bước 3 — `config/platform-permissions.js`

ERD không có collection permissions. Map này là RBAC trong code, khóa bằng `roles.code`.

```javascript
const PERMISSIONS = {
  USERS_READ: "platform.users.read",
  USERS_ASSIGN_ROLE: "platform.users.assignRole",
  USERS_UPDATE_STATUS: "platform.users.updateStatus",
  PLANS_READ: "platform.plans.read",
  PLANS_WRITE: "platform.plans.write",
  SUBSCRIPTIONS_READ: "platform.subscriptions.read",
  SUBSCRIPTIONS_WRITE: "platform.subscriptions.write",
  VENUES_READ: "platform.venues.read",
  VENUES_APPROVE: "platform.venues.approve",
  COMMISSIONS_READ: "platform.commissions.read",
  COMMISSIONS_WRITE: "platform.commissions.write",
};

const ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS),
  OWNER: [],
  USER: [],
};

function roleHasPermission(roleCodes, permission) {
  return (roleCodes || []).some((code) => {
    const granted = ROLE_PERMISSIONS[code] || [];
    return granted.includes(permission);
  });
}

module.exports = {
  PERMISSIONS,
  roleHasPermission,
};
```

## Bước 4 — `services/admin/present.js`

Mọi số tiền và chữ cái avatar đi qua file này. View không tự format.

```javascript
function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SZ";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function percentLabel(rate) {
  const value = Math.round(Number(rate) * 1000) / 10;
  return `${value}%`;
}

module.exports = {
  formatVnd,
  initials,
  percentLabel,
};
```

## Bước 5 — Ba model

Tạo `models/subscription-plan.model.js`.

```javascript
const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  duration_days: { type: Number, required: true, min: 1 },
  max_venues: { type: Number, required: true, min: 0 },
  max_courts: { type: Number, required: true, min: 0 },
  commission_rate: { type: Number, required: true, min: 0, max: 1 },
  is_featured: { type: Boolean, default: false },
  description: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

subscriptionPlanSchema.index({ status: 1 });

module.exports = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema,
  "subscription_plans"
);
```

Tạo `models/owner-subscription.model.js`.

```javascript
const mongoose = require("mongoose");

const ownerSubscriptionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionPlan",
    required: true,
  },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  amount_paid: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled"],
    required: true,
  },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

ownerSubscriptionSchema.index({ user_id: 1, status: 1 });
ownerSubscriptionSchema.index(
  { user_id: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

module.exports = mongoose.model(
  "OwnerSubscription",
  ownerSubscriptionSchema,
  "owner_subscriptions"
);
```

Tạo `models/platform-transaction.model.js`.

```javascript
const mongoose = require("mongoose");

const platformTransactionSchema = new mongoose.Schema({
  venue_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  booking_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ["commission"], required: true },
  amount: { type: Number, required: true, min: 0 },
  balance_after: { type: Number, required: true },
  description: { type: String, default: "" },
}, {
  timestamps: { createdAt: "created_at", updatedAt: false },
});

platformTransactionSchema.index({ booking_id: 1, type: 1 }, { unique: true });
platformTransactionSchema.index({ created_at: -1 });
platformTransactionSchema.index({ venue_id: 1, created_at: -1 });

module.exports = mongoose.model(
  "PlatformTransaction",
  platformTransactionSchema,
  "platform_transactions"
);
```

`venue_id` và `booking_id` không `ref` sang model của nhóm khác.

## Bước 6 — Repository

Tạo `repositories/admin/role.repository.js`. Dùng model sẵn `models/role.model.js` và `models/user-role.model.js`.

```javascript
const Role = require("../../models/role.model");
const UserRole = require("../../models/user-role.model");

function findAll() {
  return Role.find().sort({ code: 1 }).lean();
}

function findById(id) {
  return Role.findById(id).lean();
}

function findByCode(code) {
  return Role.findOne({ code }).lean();
}

function listByUserIds(userIds) {
  return UserRole.find({ user_id: { $in: userIds } })
    .populate("role_id", "code name")
    .lean();
}

function findCodesByUserId(userId) {
  return UserRole.find({ user_id: userId })
    .populate("role_id", "code name")
    .lean();
}

function assign(userId, roleId) {
  return UserRole.findOneAndUpdate(
    { user_id: userId, role_id: roleId },
    { $setOnInsert: { assigned_at: new Date() } },
    { upsert: true, new: true }
  ).lean();
}

function remove(userId, roleId) {
  return UserRole.deleteOne({ user_id: userId, role_id: roleId });
}

module.exports = {
  findAll,
  findById,
  findByCode,
  listByUserIds,
  findCodesByUserId,
  assign,
  remove,
};
```

Tạo `repositories/admin/user.repository.js`.

```javascript
const User = require("../../models/user.model");

function findActiveByEmail(email) {
  return User.findOne({
    email: email.trim(),
    status: "active",
  });
}

function findActiveById(id) {
  return User.findOne({ _id: id, status: "active" })
    .select("-password_hash")
    .lean();
}

function findById(id) {
  return User.findById(id).select("-password_hash").lean();
}

function findAll() {
  return User.find().select("-password_hash").sort({ createdAt: -1 }).lean();
}

function updateStatus(id, status) {
  return User.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).select("-password_hash").lean();
}

module.exports = {
  findActiveByEmail,
  findActiveById,
  findById,
  findAll,
  updateStatus,
};
```

Tạo `repositories/admin/plan.repository.js`.

```javascript
const Plan = require("../../models/subscription-plan.model");

function findAll() {
  return Plan.find().sort({ created_at: -1 }).lean();
}

function findActive() {
  return Plan.find({ status: "active" }).sort({ price: 1 }).lean();
}

function findById(id) {
  return Plan.findById(id).lean();
}

function create(data) {
  return Plan.create(data);
}

function updateById(id, data) {
  return Plan.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).lean();
}

module.exports = {
  findAll,
  findActive,
  findById,
  create,
  updateById,
};
```

Tạo `repositories/admin/subscription.repository.js`.

```javascript
const OwnerSubscription = require("../../models/owner-subscription.model");

function findAll() {
  return OwnerSubscription.find()
    .populate("user_id", "fullName email phone status")
    .populate("plan_id", "name price commission_rate duration_days")
    .sort({ created_at: -1 })
    .lean();
}

function findActiveByUserId(userId) {
  return OwnerSubscription.findOne({ user_id: userId, status: "active" })
    .populate("plan_id")
    .lean();
}

function countByPlanId(planId) {
  return OwnerSubscription.countDocuments({ plan_id: planId });
}

function cancelActive(userId) {
  return OwnerSubscription.updateMany(
    { user_id: userId, status: "active" },
    { $set: { status: "cancelled" } }
  );
}

function create(data) {
  return OwnerSubscription.create(data);
}

module.exports = {
  findAll,
  findActiveByUserId,
  countByPlanId,
  cancelActive,
  create,
};
```

Tạo `repositories/admin/venue.repository.js`. Đọc collection `venues` của nhóm chủ sân bằng driver, không đăng ký model Venue thứ hai.

```javascript
const mongoose = require("mongoose");

function col() {
  return mongoose.connection.collection("venues");
}

function toId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function unwrap(result) {
  if (!result) return null;
  if (Object.prototype.hasOwnProperty.call(result, "value")) return result.value;
  return result;
}

async function findPending() {
  return col().find({ status: "pending" }).sort({ _id: -1 }).toArray();
}

async function findById(id) {
  const _id = toId(id);
  if (!_id) return null;
  return col().findOne({ _id });
}

async function findByIds(ids) {
  const objectIds = ids.map(toId).filter(Boolean);
  if (!objectIds.length) return [];
  return col().find({ _id: { $in: objectIds } }).toArray();
}

async function updateStatus(id, status) {
  const _id = toId(id);
  if (!_id) return null;
  const result = await col().findOneAndUpdate(
    { _id, status: "pending" },
    { $set: { status } },
    { returnDocument: "after" }
  );
  return unwrap(result);
}

async function setFeatured(id, isFeatured) {
  const _id = toId(id);
  if (!_id) return null;
  const result = await col().findOneAndUpdate(
    { _id },
    { $set: { is_featured: isFeatured } },
    { returnDocument: "after" }
  );
  return unwrap(result);
}

module.exports = {
  findPending,
  findById,
  findByIds,
  updateStatus,
  setFeatured,
};
```

Tạo `repositories/admin/booking.repository.js`.

```javascript
const mongoose = require("mongoose");

function col() {
  return mongoose.connection.collection("bookings");
}

function toId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

async function findById(id) {
  const _id = toId(id);
  if (!_id) return null;
  return col().findOne({ _id });
}

module.exports = { findById };
```

Tạo `repositories/admin/commission.repository.js`.

```javascript
const PlatformTransaction = require("../../models/platform-transaction.model");

function findLatest() {
  return PlatformTransaction.findOne().sort({ created_at: -1, _id: -1 }).lean();
}

function insert(data) {
  return PlatformTransaction.create(data);
}

function aggregateByVenue(from, to) {
  return PlatformTransaction.aggregate([
    {
      $match: {
        type: "commission",
        created_at: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: "$venue_id",
        commission: { $sum: "$amount" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { commission: -1 } },
  ]);
}

module.exports = {
  findLatest,
  insert,
  aggregateByVenue,
};
```

## Bước 7 — Service

Tạo `services/admin/auth.service.js`.

```javascript
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AppError = require("../../middlewares/admin/app-error");
const userRepository = require("../../repositories/admin/user.repository");
const roleRepository = require("../../repositories/admin/role.repository");

async function login({ email, password }) {
  const user = await userRepository.findActiveByEmail(email);

  if (!user) {
    throw new AppError("Email hoặc mật khẩu không đúng", 401);
  }

  const matched = await bcrypt.compare(password, user.password_hash || "");

  if (!matched) {
    throw new AppError("Email hoặc mật khẩu không đúng", 401);
  }

  const links = await roleRepository.findCodesByUserId(user._id);
  const roleCodes = links
    .filter((row) => row.role_id)
    .map((row) => row.role_id.code);

  if (!roleCodes.includes("ADMIN")) {
    throw new AppError("Tài khoản không thuộc quản trị hệ thống", 403);
  }

  const accessToken = jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken };
}

module.exports = { login };
```

Tạo `services/admin/user.service.js`.

```javascript
const AppError = require("../../middlewares/admin/app-error");
const userRepository = require("../../repositories/admin/user.repository");
const roleRepository = require("../../repositories/admin/role.repository");
const { initials } = require("./present");

function mapRoles(rows) {
  return rows
    .filter((row) => row.role_id)
    .map((row) => ({
      id: row.role_id._id,
      code: row.role_id.code,
      name: row.role_id.name,
    }));
}

async function listPage() {
  const [users, allRoles] = await Promise.all([
    userRepository.findAll(),
    roleRepository.findAll(),
  ]);

  const realLinks = users.length
    ? await roleRepository.listByUserIds(users.map((user) => user._id))
    : [];

  const byUser = new Map();
  realLinks.forEach((row) => {
    const key = String(row.user_id);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(row);
  });

  return {
    users: users.map((user) => ({
      ...user,
      initials: initials(user.fullName),
      roles: mapRoles(byUser.get(String(user._id)) || []),
    })),
    allRoles,
  };
}

async function assignRole(actorId, targetId, roleId) {
  const role = await roleRepository.findById(roleId);
  const target = await userRepository.findById(targetId);

  if (!role) throw new AppError("Không có vai trò này", 404);
  if (!target) throw new AppError("Không có tài khoản này", 404);

  await roleRepository.assign(targetId, roleId);
}

async function removeRole(actorId, targetId, roleId) {
  const role = await roleRepository.findById(roleId);
  if (!role) throw new AppError("Không có vai trò này", 404);

  if (String(actorId) === String(targetId) && role.code === "ADMIN") {
    throw new AppError("Không thể tự gỡ quyền ADMIN của chính mình");
  }

  await roleRepository.remove(targetId, roleId);
}

async function changeStatus(actorId, targetId, status) {
  if (!["active", "inactive"].includes(status)) {
    throw new AppError("Trạng thái không hợp lệ");
  }

  if (String(actorId) === String(targetId) && status === "inactive") {
    throw new AppError("Không thể tự khóa tài khoản đang đăng nhập");
  }

  const updated = await userRepository.updateStatus(targetId, status);
  if (!updated) throw new AppError("Không có tài khoản này", 404);
}

module.exports = {
  listPage,
  assignRole,
  removeRole,
  changeStatus,
};
```

Tạo `services/admin/plan.service.js`.

```javascript
const AppError = require("../../middlewares/admin/app-error");
const planRepository = require("../../repositories/admin/plan.repository");
const subscriptionRepository = require("../../repositories/admin/subscription.repository");
const { formatVnd, percentLabel } = require("./present");

function decorate(plan) {
  return {
    ...plan,
    priceLabel: formatVnd(plan.price),
    rateLabel: percentLabel(plan.commission_rate),
  };
}

async function list() {
  const plans = await planRepository.findAll();
  return plans.map(decorate);
}

async function create(payload) {
  const plan = await planRepository.create({
    name: payload.name,
    price: payload.price,
    duration_days: payload.duration_days,
    max_venues: payload.max_venues,
    max_courts: payload.max_courts,
    commission_rate: payload.commission_rate,
    is_featured: payload.is_featured,
    description: payload.description,
    status: payload.status,
  });
  return decorate(plan.toObject());
}

async function update(id, payload) {
  const current = await planRepository.findById(id);
  if (!current) throw new AppError("Không có gói này", 404);

  const used = await subscriptionRepository.countByPlanId(id);
  const data = {
    name: payload.name,
    description: payload.description,
    is_featured: payload.is_featured,
    status: payload.status,
  };

  const lockedChanged = used && (
    Number(payload.price) !== current.price
    || Number(payload.duration_days) !== current.duration_days
    || Number(payload.max_venues) !== current.max_venues
    || Number(payload.max_courts) !== current.max_courts
    || Number(payload.commission_rate) !== current.commission_rate
  );

  if (lockedChanged) {
    throw new AppError("Gói đã có chủ sân dùng. Chỉ sửa tên, mô tả, nổi bật và trạng thái. Đổi giá hoặc tỷ lệ thì tạo gói mới.");
  }

  if (!used) {
    data.price = payload.price;
    data.duration_days = payload.duration_days;
    data.max_venues = payload.max_venues;
    data.max_courts = payload.max_courts;
    data.commission_rate = payload.commission_rate;
  }

  const updated = await planRepository.updateById(id, data);
  return decorate(updated);
}

module.exports = { list, create, update };
```

Tạo `services/admin/subscription.service.js`.

```javascript
const AppError = require("../../middlewares/admin/app-error");
const userRepository = require("../../repositories/admin/user.repository");
const roleRepository = require("../../repositories/admin/role.repository");
const planRepository = require("../../repositories/admin/plan.repository");
const subscriptionRepository = require("../../repositories/admin/subscription.repository");
const { formatVnd, percentLabel } = require("./present");

async function listPage() {
  const [subscriptions, users, plans] = await Promise.all([
    subscriptionRepository.findAll(),
    userRepository.findAll(),
    planRepository.findActive(),
  ]);

  const ownerIds = new Set();
  const links = await roleRepository.listByUserIds(users.map((user) => user._id));
  links.forEach((row) => {
    if (row.role_id && row.role_id.code === "OWNER") {
      ownerIds.add(String(row.user_id));
    }
  });

  return {
    owners: users.filter((user) => ownerIds.has(String(user._id)) && user.status === "active"),
    plans: plans.map((plan) => ({
      ...plan,
      priceLabel: formatVnd(plan.price),
      rateLabel: percentLabel(plan.commission_rate),
    })),
    subscriptions: subscriptions.map((row) => ({
      ...row,
      amountLabel: formatVnd(row.amount_paid),
      rateLabel: row.plan_id ? percentLabel(row.plan_id.commission_rate) : "—",
      ownerName: row.user_id ? row.user_id.fullName : "Tài khoản không còn",
      planName: row.plan_id ? row.plan_id.name : "Gói không còn",
    })),
  };
}

async function assign({ userId, planId, startDate }) {
  const user = await userRepository.findById(userId);
  if (!user || user.status !== "active") {
    throw new AppError("Tài khoản không hoạt động", 404);
  }

  const links = await roleRepository.findCodesByUserId(userId);
  const codes = links.filter((row) => row.role_id).map((row) => row.role_id.code);
  if (!codes.includes("OWNER")) {
    throw new AppError("Chỉ gán gói cho tài khoản đang có role OWNER");
  }

  const plan = await planRepository.findById(planId);
  if (!plan || plan.status !== "active") {
    throw new AppError("Gói không còn được bán");
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    throw new AppError("Ngày bắt đầu không hợp lệ");
  }

  const end = new Date(start);
  end.setDate(end.getDate() + plan.duration_days);

  await subscriptionRepository.cancelActive(userId);

  return subscriptionRepository.create({
    user_id: userId,
    plan_id: planId,
    start_date: start,
    end_date: end,
    amount_paid: plan.price,
    status: "active",
  });
}

module.exports = { listPage, assign };
```

Tạo `services/admin/venue.service.js`.

```javascript
const AppError = require("../../middlewares/admin/app-error");
const venueRepository = require("../../repositories/admin/venue.repository");
const userRepository = require("../../repositories/admin/user.repository");

async function withOwner(venues) {
  const rows = [];
  for (const venue of venues) {
    const owner = venue.owner_id
      ? await userRepository.findById(venue.owner_id)
      : null;
    rows.push({
      ...venue,
      ownerName: owner ? owner.fullName : "Chủ sân không còn",
      ownerEmail: owner ? owner.email : "",
    });
  }
  return rows;
}

async function listPending() {
  const venues = await venueRepository.findPending();
  return withOwner(venues);
}

async function approve(id) {
  const venue = await venueRepository.updateStatus(id, "active");
  if (!venue) throw new AppError("Hồ sơ không còn ở trạng thái chờ duyệt", 404);
  return venue;
}

async function reject(id) {
  const venue = await venueRepository.updateStatus(id, "rejected");
  if (!venue) throw new AppError("Hồ sơ không còn ở trạng thái chờ duyệt", 404);
  return venue;
}

async function toggleFeatured(id) {
  const venue = await venueRepository.findById(id);
  if (!venue) throw new AppError("Không có cơ sở này", 404);
  return venueRepository.setFeatured(id, !venue.is_featured);
}

module.exports = {
  listPending,
  approve,
  reject,
  toggleFeatured,
};
```

Tạo `services/admin/commission.service.js`.

```javascript
const AppError = require("../../middlewares/admin/app-error");
const bookingRepository = require("../../repositories/admin/booking.repository");
const venueRepository = require("../../repositories/admin/venue.repository");
const subscriptionRepository = require("../../repositories/admin/subscription.repository");
const planRepository = require("../../repositories/admin/plan.repository");
const commissionRepository = require("../../repositories/admin/commission.repository");
const userRepository = require("../../repositories/admin/user.repository");
const { formatVnd } = require("./present");

function rangeToDates(range) {
  const to = new Date();
  const from = new Date();
  if (range === "30d") from.setDate(from.getDate() - 30);
  else if (range === "quarter") from.setMonth(from.getMonth() - 3);
  else from.setDate(from.getDate() - 7);
  const key = range === "30d" || range === "quarter" ? range : "7d";
  return { from, to, range: key };
}

async function recordFromBooking(bookingId) {
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) throw new AppError("Không có đơn đặt", 404);
  if (booking.payment_status !== "paid") {
    throw new AppError("Đơn chưa thanh toán");
  }
  if (booking.status === "cancelled") {
    throw new AppError("Đơn đã hủy");
  }

  const venue = await venueRepository.findById(booking.venue_id);
  if (!venue) throw new AppError("Không có cơ sở của đơn này", 404);

  const subscription = await subscriptionRepository.findActiveByUserId(venue.owner_id);
  if (!subscription || !subscription.plan_id) {
    throw new AppError("Chủ sân chưa có gói đang chạy");
  }

  const plan = subscription.plan_id._id
    ? subscription.plan_id
    : await planRepository.findById(subscription.plan_id);

  const amount = Math.round(Number(booking.final_amount) * Number(plan.commission_rate));
  const latest = await commissionRepository.findLatest();
  const balanceAfter = (latest ? latest.balance_after : 0) + amount;

  try {
    return await commissionRepository.insert({
      venue_id: venue._id,
      booking_id: booking._id,
      type: "commission",
      amount,
      balance_after: balanceAfter,
      description: `Hoa hồng ${plan.commission_rate} theo gói ${plan.name}`,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new AppError("Đơn này đã ghi hoa hồng");
    }
    throw error;
  }
}

async function dashboard(range) {
  const window = rangeToDates(range);
  const grouped = await commissionRepository.aggregateByVenue(window.from, window.to);
  const latest = await commissionRepository.findLatest();
  const venues = await venueRepository.findByIds(grouped.map((row) => row._id));
  const venueMap = new Map(venues.map((venue) => [String(venue._id), venue]));

  const rows = [];
  for (const row of grouped) {
    const venue = venueMap.get(String(row._id));
    const owner = venue && venue.owner_id
      ? await userRepository.findById(venue.owner_id)
      : null;
    rows.push({
      venueName: venue ? (venue.name || "Cơ sở") : "Cơ sở không còn",
      ownerName: owner ? owner.fullName : "—",
      bookings: row.bookings,
      commission: row.commission,
      commissionLabel: formatVnd(row.commission),
    });
  }

  const total = rows.reduce((sum, row) => sum + row.commission, 0);
  const orders = rows.reduce((sum, row) => sum + row.bookings, 0);

  return {
    range: window.range,
    rows,
    stats: [
      {
        label: "HOA HỒNG TRONG KỲ",
        value: formatVnd(total),
        note: orders ? `${orders} đơn đã ghi sổ` : "Chưa có dòng sổ cái",
        noteClass: orders ? "note-green" : "note-orange",
      },
      {
        label: "CƠ SỞ PHÁT SINH",
        value: String(rows.length),
        note: "Theo venue_id trong sổ cái",
        noteClass: "note-orange",
      },
      {
        label: "ĐƠN ĐÃ GHI",
        value: String(orders),
        note: "Mỗi đơn một dòng commission",
        noteClass: "note-green",
      },
      {
        label: "SỐ DƯ SỔ CÁI",
        value: formatVnd(latest ? latest.balance_after : 0),
        note: "Dòng mới nhất toàn thời gian",
        noteClass: "note-green",
      },
    ],
  };
}

module.exports = {
  recordFromBooking,
  dashboard,
};
```

## Bước 8 — Validate

Tạo `validates/admin/platform-auth.validate.js`.

```javascript
function login(req, res, next) {
  const email = (req.body.email || "").trim();
  const password = req.body.password || "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    req.flash("error", "Email không đúng định dạng");
    return res.redirect("/admin/auth/login");
  }

  if (password.length < 6) {
    req.flash("error", "Mật khẩu tối thiểu 6 ký tự");
    return res.redirect("/admin/auth/login");
  }

  req.body.email = email;
  return next();
}

module.exports = { login };
```

Tạo `validates/admin/platform-user.validate.js`.

```javascript
const mongoose = require("mongoose");

function assignRole(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.roleId)) {
    req.flash("error", "Vai trò không hợp lệ");
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

module.exports = { assignRole, changeStatus };
```

Tạo `validates/admin/platform-plan.validate.js`.

```javascript
function parse(body) {
  return {
    name: (body.name || "").trim(),
    description: (body.description || "").trim(),
    price: Number(body.price),
    duration_days: Number(body.duration_days),
    max_venues: Number(body.max_venues),
    max_courts: Number(body.max_courts),
    commission_rate: Number(body.commission_rate),
    is_featured: body.is_featured === "on" || body.is_featured === "true",
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

function write(req, res, next) {
  const data = parse(req.body);

  if (!data.name) {
    req.flash("error", "Tên gói không được trống");
    return res.redirect("/admin/plans");
  }
  if (!Number.isFinite(data.price) || data.price < 0) {
    req.flash("error", "Giá gói không hợp lệ");
    return res.redirect("/admin/plans");
  }
  if (!Number.isInteger(data.duration_days) || data.duration_days < 1) {
    req.flash("error", "Số ngày phải là số nguyên từ 1");
    return res.redirect("/admin/plans");
  }
  if (!Number.isInteger(data.max_venues) || data.max_venues < 0) {
    req.flash("error", "Số cơ sở tối đa không hợp lệ");
    return res.redirect("/admin/plans");
  }
  if (!Number.isInteger(data.max_courts) || data.max_courts < 0) {
    req.flash("error", "Số sân tối đa không hợp lệ");
    return res.redirect("/admin/plans");
  }
  if (!Number.isFinite(data.commission_rate) || data.commission_rate < 0 || data.commission_rate > 1) {
    req.flash("error", "Tỷ lệ hoa hồng nhập từ 0 đến 1. Ví dụ 5% là 0.05");
    return res.redirect("/admin/plans");
  }

  req.plan = data;
  return next();
}

module.exports = { write };
```

Tạo `validates/admin/platform-subscription.validate.js`.

```javascript
const mongoose = require("mongoose");

function assign(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
    req.flash("error", "Chọn chủ sân");
    return res.redirect("/admin/subscriptions");
  }
  if (!mongoose.Types.ObjectId.isValid(req.body.planId)) {
    req.flash("error", "Chọn gói");
    return res.redirect("/admin/subscriptions");
  }
  if (!req.body.startDate) {
    req.flash("error", "Chọn ngày bắt đầu");
    return res.redirect("/admin/subscriptions");
  }
  return next();
}

module.exports = { assign };
```

## Bước 9 — Middleware cổng

Tạo `middlewares/admin/authenticate.middleware.js`.

```javascript
const jwt = require("jsonwebtoken");
const userRepository = require("../../repositories/admin/user.repository");
const roleRepository = require("../../repositories/admin/role.repository");
const { initials } = require("../../services/admin/present");

const LOGIN_PATH = "/admin/auth/login";

function clearPlatformCookie(res) {
  res.clearCookie("platform_access_token", { path: "/admin" });
}

module.exports = async (req, res, next) => {
  const accessToken = req.cookies.platform_access_token;

  if (!accessToken || typeof accessToken !== "string") {
    return res.redirect(LOGIN_PATH);
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await userRepository.findActiveById(decoded.id);

    if (!user) {
      clearPlatformCookie(res);
      return res.redirect(LOGIN_PATH);
    }

    const links = await roleRepository.findCodesByUserId(user._id);
    user.roleCodes = links
      .filter((row) => row.role_id)
      .map((row) => row.role_id.code);
    user.initials = initials(user.fullName);

    req.user = user;
    res.locals.user = user;
    return next();
  } catch (error) {
    clearPlatformCookie(res);
    return res.redirect(LOGIN_PATH);
  }
};
```

Tạo `middlewares/admin/require-platform-admin.middleware.js`.

Sai role thì về trang login của chính web này và chỉ xóa cookie `/admin`.

```javascript
module.exports = (req, res, next) => {
  if ((req.user.roleCodes || []).includes("ADMIN")) {
    return next();
  }

  res.clearCookie("platform_access_token", { path: "/admin" });
  req.flash("error", "Khu vực này dành cho quản trị hệ thống");
  return res.redirect("/admin/auth/login");
};
```

Tạo `middlewares/admin/authorize.middleware.js`.

```javascript
const { roleHasPermission } = require("../../config/platform-permissions");

module.exports = (permission) => (req, res, next) => {
  if (roleHasPermission(req.user.roleCodes, permission)) {
    return next();
  }

  req.flash("error", "Bạn không có quyền thực hiện thao tác này");
  return res.redirect("/admin/dashboard");
};
```

## Bước 10 — Controller

Viết lại `controllers/admin/auth.controller.js`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const AppError = require("../../middlewares/admin/app-error");
const authService = require("../../services/admin/auth.service");

const loginForm = asyncHandler(async (req, res) => {
  res.render("admin/pages/auth/login", {
    pageTitle: "Đăng nhập quản trị",
  });
});

const login = asyncHandler(async (req, res) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
    });
    const remember = req.body.remember === "on";

    res.cookie("platform_access_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/admin",
      maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000,
    });

    return res.redirect("/admin/dashboard");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Đăng nhập thất bại";
    req.flash("error", message);
    return res.redirect("/admin/auth/login");
  }
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("platform_access_token", { path: "/admin" });
  return res.redirect("/admin/auth/login");
});

module.exports = { loginForm, login, logout };
```

Viết lại `controllers/admin/user.controller.js`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const AppError = require("../../middlewares/admin/app-error");
const userService = require("../../services/admin/user.service");

function fail(req, res, error) {
  const message = error instanceof AppError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect("/admin/users");
}

const index = asyncHandler(async (req, res) => {
  const page = await userService.listPage();
  res.render("admin/pages/platform/users", {
    pageTitle: "Tài khoản và phân quyền",
    activeMenu: "users",
    users: page.users,
    allRoles: page.allRoles,
  });
});

const assignRole = asyncHandler(async (req, res) => {
  try {
    await userService.assignRole(req.user._id, req.params.id, req.body.roleId);
    req.flash("success", "Đã gán vai trò");
    return res.redirect("/admin/users");
  } catch (error) {
    return fail(req, res, error);
  }
});

const removeRole = asyncHandler(async (req, res) => {
  try {
    await userService.removeRole(req.user._id, req.params.id, req.params.roleId);
    req.flash("success", "Đã gỡ vai trò");
    return res.redirect("/admin/users");
  } catch (error) {
    return fail(req, res, error);
  }
});

const changeStatus = asyncHandler(async (req, res) => {
  try {
    await userService.changeStatus(req.user._id, req.params.id, req.body.status);
    req.flash("success", "Đã cập nhật trạng thái");
    return res.redirect("/admin/users");
  } catch (error) {
    return fail(req, res, error);
  }
});

module.exports = {
  index,
  assignRole,
  removeRole,
  changeStatus,
};
```

Tạo `controllers/admin/plan.controller.js`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const AppError = require("../../middlewares/admin/app-error");
const planService = require("../../services/admin/plan.service");

const index = asyncHandler(async (req, res) => {
  const plans = await planService.list();
  res.render("admin/pages/platform/plans", {
    pageTitle: "Gói dịch vụ chủ sân",
    activeMenu: "plans",
    plans,
  });
});

const create = asyncHandler(async (req, res) => {
  try {
    await planService.create(req.plan);
    req.flash("success", "Đã tạo gói");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Tạo gói thất bại";
    req.flash("error", message);
  }
  return res.redirect("/admin/plans");
});

const update = asyncHandler(async (req, res) => {
  try {
    await planService.update(req.params.id, req.plan);
    req.flash("success", "Đã cập nhật gói");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Cập nhật gói thất bại";
    req.flash("error", message);
  }
  return res.redirect("/admin/plans");
});

module.exports = { index, create, update };
```

Tạo `controllers/admin/subscription.controller.js`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const AppError = require("../../middlewares/admin/app-error");
const subscriptionService = require("../../services/admin/subscription.service");

const index = asyncHandler(async (req, res) => {
  const page = await subscriptionService.listPage();
  res.render("admin/pages/platform/subscriptions", {
    pageTitle: "Gán gói cho chủ sân",
    activeMenu: "subscriptions",
    owners: page.owners,
    plans: page.plans,
    subscriptions: page.subscriptions,
  });
});

const assign = asyncHandler(async (req, res) => {
  try {
    await subscriptionService.assign({
      userId: req.body.userId,
      planId: req.body.planId,
      startDate: req.body.startDate,
    });
    req.flash("success", "Đã gán gói");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Gán gói thất bại";
    req.flash("error", message);
  }
  return res.redirect("/admin/subscriptions");
});

module.exports = { index, assign };
```

Tạo `controllers/admin/venue.controller.js`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const AppError = require("../../middlewares/admin/app-error");
const venueService = require("../../services/admin/venue.service");

const index = asyncHandler(async (req, res) => {
  const venues = await venueService.listPending();
  res.render("admin/pages/platform/venues", {
    pageTitle: "Duyệt cơ sở",
    activeMenu: "venues",
    venues,
  });
});

const approve = asyncHandler(async (req, res) => {
  try {
    await venueService.approve(req.params.id);
    req.flash("success", "Đã duyệt cơ sở");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Duyệt thất bại";
    req.flash("error", message);
  }
  return res.redirect("/admin/venues");
});

const reject = asyncHandler(async (req, res) => {
  try {
    await venueService.reject(req.params.id);
    req.flash("success", "Đã từ chối hồ sơ");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Từ chối thất bại";
    req.flash("error", message);
  }
  return res.redirect("/admin/venues");
});

const feature = asyncHandler(async (req, res) => {
  try {
    await venueService.toggleFeatured(req.params.id);
    req.flash("success", "Đã cập nhật cơ sở nổi bật");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Cập nhật thất bại";
    req.flash("error", message);
  }
  return res.redirect("/admin/venues");
});

module.exports = { index, approve, reject, feature };
```

Viết lại `controllers/admin/platform-dashboard.controller.js`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const AppError = require("../../middlewares/admin/app-error");
const commissionService = require("../../services/admin/commission.service");

const index = asyncHandler(async (req, res) => {
  const report = await commissionService.dashboard(req.query.range);
  res.render("admin/pages/platform/dashboard", {
    pageTitle: "Doanh thu hoa hồng",
    activeMenu: "commissions",
    range: report.range,
    stats: report.stats,
    rows: report.rows,
  });
});

const record = asyncHandler(async (req, res) => {
  try {
    await commissionService.recordFromBooking(req.body.bookingId);
    req.flash("success", "Đã ghi hoa hồng vào sổ cái");
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Ghi sổ thất bại";
    req.flash("error", message);
  }
  return res.redirect("/admin/dashboard");
});

module.exports = { index, record };
```

## Bước 11 — Route

Viết lại `routes/admin/auth.route.js`.

```javascript
const express = require("express");
const controller = require("../../controllers/admin/auth.controller");
const validate = require("../../validates/admin/platform-auth.validate");

const router = express.Router();

router.get("/login", controller.loginForm);
router.post("/login", validate.login, controller.login);
router.get("/logout", controller.logout);

module.exports = router;
```

Viết lại `routes/admin/user.route.js`.

```javascript
const express = require("express");
const { PERMISSIONS } = require("../../config/platform-permissions");
const authorize = require("../../middlewares/admin/authorize.middleware");
const validate = require("../../validates/admin/platform-user.validate");
const controller = require("../../controllers/admin/user.controller");

const router = express.Router();

router.get("/", authorize(PERMISSIONS.USERS_READ), controller.index);
router.post(
  "/:id/roles",
  authorize(PERMISSIONS.USERS_ASSIGN_ROLE),
  validate.assignRole,
  controller.assignRole
);
router.post(
  "/:id/roles/:roleId/remove",
  authorize(PERMISSIONS.USERS_ASSIGN_ROLE),
  controller.removeRole
);
router.post(
  "/:id/status",
  authorize(PERMISSIONS.USERS_UPDATE_STATUS),
  validate.changeStatus,
  controller.changeStatus
);

module.exports = router;
```

Tạo `routes/admin/plan.route.js`.

```javascript
const express = require("express");
const { PERMISSIONS } = require("../../config/platform-permissions");
const authorize = require("../../middlewares/admin/authorize.middleware");
const validate = require("../../validates/admin/platform-plan.validate");
const controller = require("../../controllers/admin/plan.controller");

const router = express.Router();

router.get("/", authorize(PERMISSIONS.PLANS_READ), controller.index);
router.post("/", authorize(PERMISSIONS.PLANS_WRITE), validate.write, controller.create);
router.post("/:id", authorize(PERMISSIONS.PLANS_WRITE), validate.write, controller.update);

module.exports = router;
```

Tạo `routes/admin/subscription.route.js`.

```javascript
const express = require("express");
const { PERMISSIONS } = require("../../config/platform-permissions");
const authorize = require("../../middlewares/admin/authorize.middleware");
const validate = require("../../validates/admin/platform-subscription.validate");
const controller = require("../../controllers/admin/subscription.controller");

const router = express.Router();

router.get("/", authorize(PERMISSIONS.SUBSCRIPTIONS_READ), controller.index);
router.post(
  "/",
  authorize(PERMISSIONS.SUBSCRIPTIONS_WRITE),
  validate.assign,
  controller.assign
);

module.exports = router;
```

Tạo `routes/admin/venue.route.js`.

```javascript
const express = require("express");
const { PERMISSIONS } = require("../../config/platform-permissions");
const authorize = require("../../middlewares/admin/authorize.middleware");
const controller = require("../../controllers/admin/venue.controller");

const router = express.Router();

router.get("/", authorize(PERMISSIONS.VENUES_READ), controller.index);
router.post("/:id/approve", authorize(PERMISSIONS.VENUES_APPROVE), controller.approve);
router.post("/:id/reject", authorize(PERMISSIONS.VENUES_APPROVE), controller.reject);
router.post("/:id/feature", authorize(PERMISSIONS.VENUES_APPROVE), controller.feature);

module.exports = router;
```

Viết lại `routes/admin/platform-dashboard.route.js`.

```javascript
const express = require("express");
const { PERMISSIONS } = require("../../config/platform-permissions");
const authorize = require("../../middlewares/admin/authorize.middleware");
const controller = require("../../controllers/admin/platform-dashboard.controller");

const router = express.Router();

router.get("/", authorize(PERMISSIONS.COMMISSIONS_READ), controller.index);
router.post("/record", authorize(PERMISSIONS.COMMISSIONS_WRITE), controller.record);

module.exports = router;
```

## Bước 12 — Giao diện

CSS mới chỉ tải trên các trang platform, qua `block head`. Không thêm link vào `views/admin/layouts/default.pug`, vì layout đó chủ sân cũng dùng.

Tạo `public/admin/css/platform.css`.

```css
.pf-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.pf-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--green);
}

.pf-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.pf-sub {
  margin: 6px 0 0;
  color: var(--muted);
  max-width: 640px;
  line-height: 1.5;
}

.pf-range {
  display: flex;
  gap: 6px;
  padding: 5px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
}

.pf-range a {
  text-decoration: none;
  color: #475569;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 10px;
}

.pf-range a.active {
  background: var(--ink);
  color: #fff;
}

.pf-grid {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr;
  gap: 16px;
}

.pf-split {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  align-items: start;
}

.pf-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pf-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
}

.pf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pf-person {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pf-avatar,
.pf-avatar-sm {
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-weight: 800;
  flex: none;
}

.pf-avatar {
  width: 40px;
  height: 40px;
  font-size: 13px;
}

.pf-avatar-sm {
  width: 36px;
  height: 36px;
  font-size: 12px;
  border-radius: 10px;
}

.pf-avatar img,
.pf-person img {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
}

.pf-logout {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 700;
  font-size: 13px;
}

.pf-logout:hover {
  border-color: #a7f3d0;
  color: var(--green-dark);
}

.pf-plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.pf-plan {
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(180deg, #fff, #f8fafc);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 220px;
}

.pf-plan.is-featured {
  border-color: #6ee7b7;
  box-shadow: var(--shadow-green);
}

.pf-rate {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.pf-meta {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.pf-inline {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.pf-inline form {
  margin: 0;
}

.sz-role.role-user {
  background: #d1fae5;
  color: #047857;
}

.pf-details {
  margin-top: auto;
}

.pf-details summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--green);
  font-size: 13px;
}

@media (max-width: 991px) {
  .pf-grid,
  .pf-split {
    grid-template-columns: 1fr;
  }

  .pf-title {
    font-size: 24px;
  }
}
```

Tạo `public/admin/js/platform.js`.

```javascript
document.addEventListener("submit", (event) => {
  const form = event.target;
  const message = form.getAttribute("data-confirm");
  if (message && !window.confirm(message)) {
    event.preventDefault();
  }
});

const search = document.querySelector("[data-pf-search]");
if (search) {
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll("[data-pf-row]").forEach((row) => {
      const haystack = (row.getAttribute("data-pf-row") || "").toLowerCase();
      row.hidden = Boolean(query) && !haystack.includes(query);
    });
  });
}
```

### `views/admin/pages/platform/dashboard.pug`

Viết lại toàn bộ file.

```pug
extends ../../layouts/default.pug
include ../../../mixins/alert.pug

block head
  link(rel="stylesheet" href="/admin/css/platform.css")

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    .pf-head-copy
      p.pf-kicker Sổ cái nền tảng
      h1.pf-title Doanh thu hoa hồng
      p.pf-sub Số liệu lấy từ collection platform_transactions. Tỷ lệ nằm trên gói đang chạy của chủ sân.
    nav.pf-range(aria-label="Khoảng thời gian")
      a(href="/admin/dashboard?range=7d" class=(range === "7d" ? "active" : undefined)) 7 ngày
      a(href="/admin/dashboard?range=30d" class=(range === "30d" ? "active" : undefined)) 30 ngày
      a(href="/admin/dashboard?range=quarter" class=(range === "quarter" ? "active" : undefined)) Quý này

  .row.g-3.mb-3
    each s in stats
      .col-12.col-sm-6.col-xl-3
        .sz-card.sz-stat
          span.sz-stat-label= s.label
          .sz-stat-value= s.value
          .sz-stat-note(class=s.noteClass)= s.note

  .pf-grid
    section.sz-card.sz-panel
      h2.sz-panel-title Hoa hồng theo cơ sở
      p.sz-panel-sub Mỗi dòng là tổng amount của các giao dịch commission trong kỳ.
      if rows.length
        .table-responsive
          table.sz-table
            thead
              tr
                th Cơ sở
                th Chủ sân
                th Đơn
                th Hoa hồng
            tbody
              each row in rows
                tr
                  td
                    strong= row.venueName
                  td= row.ownerName
                  td= row.bookings
                  td
                    strong.note-green= row.commissionLabel
      else
        p.sz-empty Chưa có giao dịch trong khoảng thời gian này.

    section.sz-card.sz-panel
      h2.sz-panel-title Ghi sổ từ đơn đã thanh toán
      p.sz-panel-sub Nhập _id của booking có payment_status = paid. Hệ thống tự nhân final_amount với commission_rate của gói active.
      form.pf-form(method="post" action="/admin/dashboard/record")
        label.pf-field
          span.sz-label Mã đơn (ObjectId)
          input.sz-input(type="text" name="bookingId" required placeholder="674a...")
        button.sz-btn.sz-btn-green(type="submit")
          i.bi.bi-journal-plus
          |  Ghi hoa hồng

block script
  script(src="/admin/js/platform.js")
```

### `views/admin/pages/platform/users.pug`

```pug
extends ../../layouts/default.pug
include ../../../mixins/alert.pug

block head
  link(rel="stylesheet" href="/admin/css/platform.css")

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    .pf-head-copy
      p.pf-kicker RBAC
      h1.pf-title Tài khoản và phân quyền
      p.pf-sub Danh sách lấy từ users. Vai trò lấy từ user_roles. Ô chọn vai trò lấy từ collection roles.
    input.sz-input.sz-input-search(type="search" placeholder="Tìm tên, email, số điện thoại" data-pf-search)

  section.sz-card.sz-panel
    .table-responsive
      table.sz-table
        thead
          tr
            th Tài khoản
            th Liên hệ
            th Vai trò đang gán
            th Trạng thái
            th Thao tác
        tbody
          each u in users
            tr(data-pf-row=`${u.fullName} ${u.email} ${u.phone}`)
              td
                .pf-person
                  if u.avatar_url
                    img(src=u.avatar_url alt=u.fullName)
                  else
                    span.pf-avatar= u.initials
                  div
                    strong= u.fullName
                    small.sz-muted.d-block= u._id
              td
                div= u.email
                small.sz-muted= u.phone
              td
                .pf-inline
                  each role in u.roles
                    span.sz-role(class=`role-${role.code.toLowerCase()}`)= role.code
                    form(method="post" action=`/admin/users/${u._id}/roles/${role.id}/remove` data-confirm=`Gỡ ${role.code} của ${u.fullName}?`)
                      button.sz-btn.sz-btn-outline-danger.sz-btn-sm(type="submit") Gỡ
                  if !u.roles.length
                    span.sz-muted Chưa gán
                form.pf-inline(method="post" action=`/admin/users/${u._id}/roles`)
                  select.sz-select.sz-select-sm(name="roleId" required)
                    option(value="") Chọn vai trò
                    each role in allRoles
                      option(value=role._id)= role.code
                  button.sz-btn.sz-btn-dark.sz-btn-sm(type="submit") Gán
              td
                if u.status === "active"
                  span.sz-badge.sz-badge-ok Đang hoạt động
                else
                  span.sz-badge.sz-badge-danger Đã khóa
              td
                - const nextStatus = u.status === "active" ? "inactive" : "active"
                form(method="post" action=`/admin/users/${u._id}/status` data-confirm=u.status === "active" ? `Khóa ${u.fullName}?` : `Mở khóa ${u.fullName}?`)
                  input(type="hidden" name="status" value=nextStatus)
                  button.sz-btn.sz-btn-sm(class=u.status === "active" ? "sz-btn-outline-danger" : "sz-btn-green" type="submit")
                    = u.status === "active" ? "Khóa" : "Mở khóa"

block script
  script(src="/admin/js/platform.js")
```

### `views/admin/pages/platform/plans.pug`

```pug
extends ../../layouts/default.pug
include ../../../mixins/alert.pug

block head
  link(rel="stylesheet" href="/admin/css/platform.css")

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    .pf-head-copy
      p.pf-kicker Sản phẩm của sàn
      h1.pf-title Gói dịch vụ chủ sân
      p.pf-sub commission_rate nhập số từ 0 đến 1. Năm phần trăm là 0.05.

  .pf-split
    section.sz-card.sz-panel
      h2.sz-panel-title Tạo gói
      form.pf-form(method="post" action="/admin/plans")
        label.pf-field
          span.sz-label Tên gói
          input.sz-input(type="text" name="name" required)
        label.pf-field
          span.sz-label Giá (VND)
          input.sz-input(type="number" name="price" min="0" step="1000" required)
        label.pf-field
          span.sz-label Số ngày
          input.sz-input(type="number" name="duration_days" min="1" step="1" required)
        label.pf-field
          span.sz-label Tối đa cơ sở
          input.sz-input(type="number" name="max_venues" min="0" step="1" required)
        label.pf-field
          span.sz-label Tối đa sân
          input.sz-input(type="number" name="max_courts" min="0" step="1" required)
        label.pf-field
          span.sz-label Tỷ lệ hoa hồng
          input.sz-input(type="number" name="commission_rate" min="0" max="1" step="0.01" required placeholder="0.05")
        label.pf-field
          span.sz-label Mô tả
          textarea.sz-input(name="description" rows="3")
        label.pf-check
          input(type="checkbox" name="is_featured")
          span Gói nổi bật
        input(type="hidden" name="status" value="active")
        button.sz-btn.sz-btn-green(type="submit") Lưu gói

    section
      if plans.length
        .pf-plan-grid
          each plan in plans
            article.pf-plan(class=plan.is_featured ? "is-featured" : undefined)
              .pf-inline
                strong= plan.name
                if plan.status === "active"
                  span.sz-badge.sz-badge-ok Đang bán
                else
                  span.sz-badge.sz-badge-warn Ngừng bán
              .pf-rate= plan.rateLabel
              .pf-meta= plan.priceLabel
              .pf-meta #{plan.duration_days} ngày · #{plan.max_venues} cơ sở · #{plan.max_courts} sân
              if plan.description
                p.sz-muted.mb-0= plan.description
              details.pf-details
                summary Sửa gói
                form.pf-form(method="post" action=`/admin/plans/${plan._id}`)
                  label.pf-field
                    span.sz-label Tên
                    input.sz-input(type="text" name="name" value=plan.name required)
                  label.pf-field
                    span.sz-label Giá
                    input.sz-input(type="number" name="price" min="0" step="1000" value=plan.price required)
                  label.pf-field
                    span.sz-label Số ngày
                    input.sz-input(type="number" name="duration_days" min="1" step="1" value=plan.duration_days required)
                  label.pf-field
                    span.sz-label Tối đa cơ sở
                    input.sz-input(type="number" name="max_venues" min="0" step="1" value=plan.max_venues required)
                  label.pf-field
                    span.sz-label Tối đa sân
                    input.sz-input(type="number" name="max_courts" min="0" step="1" value=plan.max_courts required)
                  label.pf-field
                    span.sz-label Tỷ lệ
                    input.sz-input(type="number" name="commission_rate" min="0" max="1" step="0.01" value=plan.commission_rate required)
                  label.pf-field
                    span.sz-label Mô tả
                    textarea.sz-input(name="description" rows="2")= plan.description
                  label.pf-field
                    span.sz-label Trạng thái
                    select.sz-select(name="status")
                      option(value="active" selected=plan.status === "active") active
                      option(value="inactive" selected=plan.status === "inactive") inactive
                  label.pf-check
                    input(type="checkbox" name="is_featured" checked=plan.is_featured)
                    span Nổi bật
                  button.sz-btn.sz-btn-dark.sz-btn-sm(type="submit") Cập nhật
      else
        p.sz-empty Chưa có gói. Tạo gói đầu tiên ở cột bên trái.

block script
  script(src="/admin/js/platform.js")
```

### `views/admin/pages/platform/subscriptions.pug`

```pug
extends ../../layouts/default.pug
include ../../../mixins/alert.pug

block head
  link(rel="stylesheet" href="/admin/css/platform.css")

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    .pf-head-copy
      p.pf-kicker Hợp đồng
      h1.pf-title Gán gói cho chủ sân
      p.pf-sub Chỉ user đang có role OWNER và đang active mới xuất hiện trong danh sách.

  .pf-split
    section.sz-card.sz-panel
      h2.sz-panel-title Gán gói mới
      form.pf-form(method="post" action="/admin/subscriptions")
        label.pf-field
          span.sz-label Chủ sân
          select.sz-select(name="userId" required)
            option(value="") Chọn chủ sân
            each owner in owners
              option(value=owner._id) #{owner.fullName} — #{owner.email}
        label.pf-field
          span.sz-label Gói đang bán
          select.sz-select(name="planId" required)
            option(value="") Chọn gói
            each plan in plans
              option(value=plan._id) #{plan.name} · #{plan.rateLabel} · #{plan.priceLabel}
        label.pf-field
          span.sz-label Ngày bắt đầu
          input.sz-input(type="date" name="startDate" required)
        button.sz-btn.sz-btn-green(type="submit") Gán gói
      if !owners.length
        p.sz-muted Gán role OWNER cho một tài khoản ở trang Tài khoản trước.

    section.sz-card.sz-panel
      h2.sz-panel-title Lịch sử
      if subscriptions.length
        .table-responsive
          table.sz-table
            thead
              tr
                th Chủ sân
                th Gói
                th Đã thu
                th Tỷ lệ
                th Hiệu lực
                th Trạng thái
            tbody
              each row in subscriptions
                tr
                  td
                    strong= row.ownerName
                  td= row.planName
                  td= row.amountLabel
                  td= row.rateLabel
                  td
                    .pf-meta
                      = row.start_date ? new Date(row.start_date).toLocaleDateString("vi-VN") : ""
                      |  → 
                      = row.end_date ? new Date(row.end_date).toLocaleDateString("vi-VN") : ""
                  td
                    if row.status === "active"
                      span.sz-badge.sz-badge-ok active
                    else if row.status === "cancelled"
                      span.sz-badge.sz-badge-danger cancelled
                    else
                      span.sz-badge.sz-badge-warn= row.status
      else
        p.sz-empty Chưa gán gói nào.

block script
  script(src="/admin/js/platform.js")
```

### `views/admin/pages/platform/venues.pug`

```pug
extends ../../layouts/default.pug
include ../../../mixins/alert.pug

block head
  link(rel="stylesheet" href="/admin/css/platform.css")

block main
  +alert-success(3000)
  +alert-error(5000)

  header.pf-head
    .pf-head-copy
      p.pf-kicker Vận hành sàn
      h1.pf-title Duyệt cơ sở
      p.pf-sub Chỉ hiện document venues có status = pending. Duyệt ghi active, từ chối ghi rejected.

  if venues.length
    each venue in venues
      article.sz-approve-card
        .sz-approve-info
          .d-flex.align-items-center.gap-2.mb-1
            strong= venue.name || "Cơ sở chưa đặt tên"
            if venue.is_featured
              span.sz-badge.sz-badge-ok Nổi bật
            else
              span.sz-badge.sz-badge-warn Chờ duyệt
          p.mb-1 #{venue.address || ""} #{venue.district || ""} #{venue.city || ""}
          p.sz-muted.mb-0 Chủ sân: #{venue.ownerName}
            if venue.ownerEmail
              |  · #{venue.ownerEmail}
        .pf-actions
          form(method="post" action=`/admin/venues/${venue._id}/approve`)
            button.sz-btn.sz-btn-green.sz-btn-sm(type="submit")
              i.bi.bi-check2-circle
              |  Duyệt
          form(method="post" action=`/admin/venues/${venue._id}/reject` data-confirm="Từ chối hồ sơ này?")
            button.sz-btn.sz-btn-outline-danger.sz-btn-sm(type="submit") Từ chối
          form(method="post" action=`/admin/venues/${venue._id}/feature`)
            button.sz-btn.sz-btn-dark.sz-btn-sm(type="submit")
              = venue.is_featured ? "Bỏ nổi bật" : "Gắn nổi bật"
  else
    section.sz-card.sz-panel
      p.sz-empty.mb-0 Chưa có hồ sơ chờ duyệt. Khi nhóm chủ sân tạo venue status pending, tải lại trang này.

block script
  script(src="/admin/js/platform.js")
```

## Bước 13 — Sửa menu, header, form login

Trong `views/admin/partials/sider.pug`, thay đúng nhánh `if panelRole === "admin"` bằng đoạn dưới. Giữ nguyên nhánh `else` của chủ sân.

```pug
if panelRole === "admin"
  .sz-facility
    .d-flex.justify-content-between.align-items-center
      small.sz-facility-label NỀN TẢNG SPORTZONE
      span.sz-dot-green(aria-hidden="true")
    .sz-facility-name Admin Console
    .sz-facility-plan
      i.bi.bi-shield-lock
      |  Quản trị toàn hệ thống

  .sz-menu-title PHÂN HỆ QUẢN TRỊ
  nav.sz-menu(aria-label="Menu quản trị hệ thống")
    a.sz-menu-item(href="/admin/dashboard" class=(activeMenu === "commissions" ? "active" : undefined))
      i.bi.bi-cash-stack
      span.sz-menu-text Doanh thu hoa hồng
    a.sz-menu-item(href="/admin/users" class=(activeMenu === "users" ? "active" : undefined))
      i.bi.bi-people
      span.sz-menu-text Tài khoản và phân quyền
    a.sz-menu-item(href="/admin/plans" class=(activeMenu === "plans" ? "active" : undefined))
      i.bi.bi-box-seam
      span.sz-menu-text Gói dịch vụ
    a.sz-menu-item(href="/admin/subscriptions" class=(activeMenu === "subscriptions" ? "active" : undefined))
      i.bi.bi-card-checklist
      span.sz-menu-text Gán gói chủ sân
    a.sz-menu-item(href="/admin/venues" class=(activeMenu === "venues" ? "active" : undefined))
      i.bi.bi-building-check
      span.sz-menu-text Duyệt cơ sở

  .sz-sidebar-bottom
    .sz-copy Hệ thống SportZone
```

Trong `views/admin/partials/header.pug`, thay đúng nhánh `if panelRole === "admin"` . Bỏ chuông vì không có nghiệp vụ thông báo trên web này. Giữ nguyên nhánh `else`.

```pug
if panelRole === "admin"
  .sz-role-pill
    span.dot
    | Super Admin
  a.sz-user(href="/admin/users")
    span.pf-avatar-sm= user && user.initials ? user.initials : "AD"
    div
      .sz-user-name= user && user.fullName ? user.fullName : "Quản trị"
      .sz-user-wallet Quản trị hệ thống
  a.pf-logout(href="/admin/auth/logout")
    i.bi.bi-box-arrow-right
    span Thoát
```

Header admin dùng class `pf-avatar-sm` và `pf-logout`. Thêm một dòng trong `views/admin/layouts/default.pug` sẽ làm chủ sân cũng tải CSS này. Vì header admin chỉ hiện khi `panelRole === "admin"`, thêm link CSS trong `middlewares/admin/locals.middleware.js` là không cần. Cách sạch: thêm vào `views/admin/layouts/default.pug` trong `head`, sau link `style.css`:

```pug
if panelRole === "admin"
  link(rel="stylesheet" href="/admin/css/platform.css")
```

`panelRole` được locals middleware gán trước khi render, nên nhánh này chỉ chạy trên `/admin`. Chủ sân đi `/owner` và middleware owner đặt `panelRole = "owner"`, nên không tải file này.

Trong `views/admin/pages/auth/login.pug` sửa hai chỗ.

Đổi `action` của form từ `/admin/login` thành `/admin/auth/login`.

Thay khối `if error` bằng flash thật của app:

```pug
if messages && messages.error
  div.alert(role="alert")
    i.bi.bi-exclamation-circle
    span= messages.error
```

Đổi `href` logo trong header trang login từ `/admin/login` thành `/admin/auth/login`.

## Bước 14 — Gắn route

Viết lại toàn bộ `routes/admin/index.route.js`. Làm bước này sau khi các file route và view ở trên đã có.

Route `/auth` gắn trước `authenticate`. Mọi URL `/admin` còn lại đi qua cổng.

```javascript
const systemConfig = require("../../config/system");
const localsAdmin = require("../../middlewares/admin/locals.middleware");
const authenticate = require("../../middlewares/admin/authenticate.middleware");
const requirePlatformAdmin = require("../../middlewares/admin/require-platform-admin.middleware");

const authRoutes = require("./auth.route");
const dashboardRoutes = require("./platform-dashboard.route");
const userRoutes = require("./user.route");
const planRoutes = require("./plan.route");
const subscriptionRoutes = require("./subscription.route");
const venueRoutes = require("./venue.route");

module.exports = (app) => {
  const PATH = systemConfig.prefixAdmin;

  app.use(PATH, localsAdmin);
  app.use(PATH + "/auth", authRoutes);

  app.use(PATH, authenticate);
  app.use(PATH, requirePlatformAdmin);

  app.get(PATH, (req, res) => {
    res.redirect(PATH + "/dashboard");
  });

  app.use(PATH + "/dashboard", dashboardRoutes);
  app.use(PATH + "/users", userRoutes);
  app.use(PATH + "/plans", planRoutes);
  app.use(PATH + "/subscriptions", subscriptionRoutes);
  app.use(PATH + "/venues", venueRoutes);
};
```

Không mount `platform-permissions.route.js`. File đó và `views/admin/pages/platform/permissions.pug` để nguyên, không còn đường vào.

`index.js` ở thư mục gốc giữ nguyên. Nó đã gọi `routes/admin/index.route.js`.

## Bước 15 — `scripts/seed-platform.js`

Chạy một lần. Script upsert, không xóa collection.

Thêm vào `.env` (file này không commit):

```text
SEED_ADMIN_EMAIL=admin@sportzone.vn
SEED_ADMIN_PHONE=0900000001
SEED_ADMIN_PASSWORD=Admin@123456
```

```javascript
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const UserRole = require("../models/user-role.model");

const ROLES = [
  { code: "ADMIN", name: "Quản trị hệ thống", description: "Vào web /admin" },
  { code: "OWNER", name: "Chủ sân", description: "Vào web chủ sân" },
  { code: "USER", name: "Người dùng", description: "Dùng app đặt sân" },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);

  const roles = [];
  for (const item of ROLES) {
    const role = await Role.findOneAndUpdate(
      { code: item.code },
      item,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roles.push(role);
  }

  const email = process.env.SEED_ADMIN_EMAIL || "admin@sportzone.vn";
  const phone = process.env.SEED_ADMIN_PHONE || "0900000001";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";
  const password_hash = await bcrypt.hash(password, 10);

  const user = await User.findOneAndUpdate(
    { email },
    {
      fullName: "Super Admin",
      email,
      phone,
      password_hash,
      status: "active",
      role: "ADMIN",
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const adminRole = roles.find((role) => role.code === "ADMIN");
  await UserRole.findOneAndUpdate(
    { user_id: user._id, role_id: adminRole._id },
    { $setOnInsert: { assigned_at: new Date() } },
    { upsert: true, new: true }
  );

  console.log("Seed xong:", email);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

`users.role = "ADMIN"` chỉ để qua schema bắt buộc. Đăng nhập kiểm tra document trong `user_roles`.

`phone` unique. Trùng số thì đổi `SEED_ADMIN_PHONE`.

Chạy:

```text
node scripts/seed-platform.js
```

## Bước 16 — Kiểm tra

1. Chưa có cookie, mở `/admin/dashboard` thì về `/admin/auth/login`.
2. Đăng nhập email seed. Vào dashboard. Header là tên trong Mongo, không còn tên cứng.
3. `/admin/users` có user thật. Gán `OWNER` thì Compass có document `user_roles`. Tự gỡ `ADMIN` của mình thì bị flash lỗi.
4. Tạo gói giá `500000`, tỷ lệ `0.05`. Card hiện `5%` và tiền VND. Sửa giá sau khi đã có người dùng gói thì bị từ chối.
5. Gán gói cho user chưa có role `OWNER` thì bị từ chối. Gán lần hai thì dòng cũ thành `cancelled`, còn một dòng `active`.
6. `/admin/venues` trống khi không có `venues.status = "pending"`. Có document thì hiện đúng `name` trong database. Duyệt xong document đó biến mất khỏi hàng chờ và `status` thành `active`.
7. Dashboard không có số tiền viết trong controller. Thêm một document `platform_transactions` trong Compass, tải lại, tổng đổi theo. Xóa document, tổng về 0.
8. Ghi sổ một `booking_id` đã `paid` thì có một dòng commission. Ghi lần hai thì flash đã ghi. `amount` bằng `final_amount` nhân `commission_rate` của gói active.
9. Đăng xuất về login. Cookie `platform_access_token` mất. Cookie của app người dùng, nếu đang có, vẫn còn vì khác tên và khác path.
