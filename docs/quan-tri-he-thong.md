# Web quản trị hệ thống (`/admin`)

Tài liệu này để đọc và làm theo. Repo chưa bị sửa bởi tài liệu.

Phần của bạn là super admin nền tảng, role `ADMIN`, URL `/admin`.
Nhóm chủ sân giữ `/owner`. Nhóm người dùng giữ app đặt sân.
Cùng một database MongoDB. Mỗi người chỉ tạo collection của phần mình.

Mô hình làm việc: **Modular Monolith + Layered Architecture + RBAC**.

- Modular monolith: một app Express, một MongoDB, module nền tảng nằm riêng.
- Layered: `route → authenticate → authorize → validator → controller → service → repository → collection`.
- RBAC: quyền lấy từ collection `roles` và `user_roles` đúng ERD. Một file map quyền trong code. ERD không có bảng permissions, nên không tạo collection permissions.

Dữ liệu trên màn hình đều là kết quả query. Controller không khai báo mảng sân, user, hay số tiền.

---

## 1. Bảng bạn thêm vào MongoDB

ERD vẽ theo SQL (`int id`, khóa ngoại). Trong MongoDB mỗi bảng là một collection, khóa chính là `_id` kiểu ObjectId. Không tạo field `id` số nguyên song song với `_id`.

### 1.1. Tạo mới — 3 collection

Ba collection này chưa có trong repo. Đây là phần dữ liệu bạn sở hữu.

| Collection | Việc của bạn | Vì sao thuộc quản trị hệ thống |
|---|---|---|
| `subscription_plans` | Tạo, sửa, ngừng bán gói cho chủ sân | `commission_rate`, `max_venues`, `max_courts`, `is_featured` là luật của sàn, không phải của một chủ sân |
| `owner_subscriptions` | Gán gói cho từng chủ sân, lưu lịch sử | Biết chủ sân nào đang chịu mức hoa hồng nào |
| `platform_transactions` | Sổ cái hoa hồng của sàn | Dashboard đọc collection này. Mỗi dòng là một khoản đã ghi, gắn `venue_id` và `booking_id` |

### 1.2. Đã có model trong repo — bạn ghi dữ liệu, không tạo schema thứ hai

| Collection | File model đang có | Việc của bạn |
|---|---|---|
| `roles` | `models/role.model.js` | Seed 3 role `ADMIN`, `OWNER`, `USER`. Form gán quyền đọc từ collection này |
| `user_roles` | `models/user-role.model.js` | Gán và gỡ role. Unique `(user_id, role_id)` model đã khai báo |

Hai collection này chính là RBAC trên ERD. Nguồn sự thật của quyền là `user_roles`, không phải field `role` đang nằm trên `models/user.model.js`. Field `users.role` không có trên ERD. Module của bạn không đọc field đó. Nhóm auth tự quyết định field đó sau, bạn không sửa file model user.

### 1.3. Collection người khác tạo — bạn chỉ đọc hoặc sửa đúng vài field

| Collection | Nhóm sở hữu schema | Field bạn được đụng |
|---|---|---|
| `users` | Nhóm đăng ký / app user. Model sẵn ở `models/user.model.js` | Đọc `fullName`, `email`, `phone`, `avatar_url`, `status`. Ghi mỗi `status`: `active` hoặc `inactive`. Được upsert đúng 1 tài khoản admin để đăng nhập |
| `venues` | Nhóm chủ sân | Đọc để duyệt. Ghi `status` và `is_featured` |
| `bookings` | Nhóm đặt sân | Chỉ đọc khi ghi sổ hoa hồng: `venue_id`, `user_id`, `final_amount`, `commission_amount`, `payment_status`, `status`, `createdAt` |

Tên field của `users` giữ đúng model hiện có: `fullName`, không phải `full_name` trên ERD. Collection bạn tạo mới thì dùng tên field snake_case của ERD (`user_id`, `commission_rate`, `created_at`) để cả team nhìn sơ đồ là đối chiếu được.

### 1.4. Bảng trên ERD bạn không tạo

| Bảng ERD | Quyết định |
|---|---|
| `notifications` | Module dùng chung. Ai phát sinh sự kiện thì người đó ghi. Tạo ở đây sẽ đụng mọi nhóm |
| `court_types`, `courts`, `venue_images`, `amenities`, `venue_amenities`, `price_rules` | Chủ sân. `venue_amenities` là bảng nối của SQL; nhóm chủ sân có thể nhúng `amenity_ids` trong document `venues` |
| `bookings` (tạo schema), `booking_slots`, `booking_items`, `payments` | Nhóm đặt sân. `booking_slots` và `booking_items` cùng mô tả khung giờ; việc gộp hay giữ là của nhóm đó |
| `vouchers`, `voucher_usages` | Theo từng `venue_id`, thuộc chủ sân. Repo đã có voucher ở `models/finance.model.js` |
| `reviews` | Người dùng viết, chủ sân trả lời. `is_hidden` là việc kiểm duyệt sau, không nằm trong phạm vi bảng lần này |
| Bảng `permissions` | ERD không có. Quyền chi tiết map từ `roles.code` trong code |

---

## 2. Sơ đồ phần của bạn

```text
roles 1 ──── n user_roles n ──── 1 users
                                    │
                                    │ user_id
                                    ▼
subscription_plans 1 ──── n owner_subscriptions

venues 1 ──── n platform_transactions n ──── 1 bookings
```

`users`, `venues`, `bookings` là collection người khác. Mũi tên nghĩa là bạn lưu ObjectId trỏ sang họ, hoặc đọc document của họ. Bạn không khai báo lại schema của họ.

---

## 3. Schema 3 collection bạn tạo

Tiền dùng `Number`, đơn vị VND, số nguyên. `commission_rate` là `Number` từ 0 đến 1 (`0.05` = 5%). Cùng kiểu số với các model tiền đang có trong repo.

Thời gian dùng `Date`. Bật timestamp đúng tên ERD: `created_at`, `updated_at`.

### 3.1. `subscription_plans`

| Field | Kiểu | Ràng buộc |
|---|---|---|
| `name` | String | Bắt buộc |
| `price` | Number | VND, `min: 0` |
| `duration_days` | Number | Số nguyên, `min: 1` |
| `max_venues` | Number | Số nguyên, `min: 0` |
| `max_courts` | Number | Số nguyên, `min: 0` |
| `commission_rate` | Number | `min: 0`, `max: 1` |
| `is_featured` | Boolean | Mặc định `false` |
| `description` | String | |
| `status` | String | `active` hoặc `inactive`. ERD không có field này. Thêm để ngừng bán gói mà vẫn giữ lịch sử `owner_subscriptions` |
| `created_at`, `updated_at` | Date | Timestamp |

`status` là field phụ duy nhất ngoài ERD. Xóa vật lý một gói sẽ làm gãy các dòng `owner_subscriptions` đang trỏ tới. Ngừng bán bằng `inactive`.

Index: `{ status: 1 }`.

### 3.2. `owner_subscriptions`

| Field | Kiểu | Ràng buộc |
|---|---|---|
| `user_id` | ObjectId | Ref `User`, bắt buộc. Người này phải đang có role `OWNER` |
| `plan_id` | ObjectId | Ref `subscription_plans`, bắt buộc |
| `start_date` | Date | Bắt buộc |
| `end_date` | Date | `start_date + duration_days` của gói, tính ở service |
| `amount_paid` | Number | Chụp `price` của gói tại thời điểm gán |
| `status` | String | `active`, `expired`, `cancelled` |
| `created_at` | Date | Timestamp |

Một chủ sân có nhiều dòng theo thời gian. Tại một thời điểm chỉ một dòng `active`.

Index:

- `{ user_id: 1, status: 1 }`
- Unique một phần: `user_id` với `partialFilterExpression: { status: "active" }`

### 3.3. `platform_transactions`

| Field | Kiểu | Ràng buộc |
|---|---|---|
| `venue_id` | ObjectId | Id document trong `venues` |
| `booking_id` | ObjectId | Id document trong `bookings` |
| `type` | String | `commission`. ERD để `type` tự do; phần của bạn chỉ ghi hoa hồng sàn |
| `amount` | Number | VND, `min: 0` |
| `balance_after` | Number | Số dư sổ cái sàn sau dòng này |
| `description` | String | |
| `created_at` | Date | Timestamp |

Index unique `{ booking_id: 1, type: 1 }` để một đơn không bị ghi hoa hồng hai lần.

Công thức nằm ở service, lấy tỷ lệ từ gói đang chạy:

```text
amount = làm tròn( booking.final_amount × plan.commission_rate )
```

`plan` là gói `active` của `venues.owner_id` tại thời điểm thanh toán. Tỷ lệ không viết số `0.05` trong controller. Chủ sân chưa có gói active thì không ghi sổ, trả lỗi để nhóm đặt sân biết.

`balance_after` = `balance_after` của dòng mới nhất + `amount` dòng này.

ERD còn gợi ý phí thu từ người đặt. Sơ đồ không có cột tỷ lệ phí người dùng, nên không bịa thêm `type = user_fee` và không bịa thêm một mức phần trăm. Khi team thêm cột tỷ lệ vào ERD thì mới thêm type mới trong cùng collection.

---

## 4. Hợp đồng với collection của nhóm khác

Thống nhất chuỗi status trước khi hai bên cùng ghi. Đề xuất dưới đây. Nếu nhóm kia đã chốt chữ khác, dùng chữ của họ ở repository, đừng tạo collection thứ hai.

### `users` — model sẵn

Đọc: `fullName`, `email`, `phone`, `avatar_url`, `status`, `createdAt`.
Ghi: `status` = `active` | `inactive`.
Không ghi `password_hash`. Không gán quyền bằng cách sửa `users.role`.

### `venues` — nhóm chủ sân tạo

Bạn cần các field:

| Field | Bạn làm gì |
|---|---|
| `owner_id` | ObjectId sang `users`. Đọc để biết chủ sân |
| `name`, `address`, `city`, `district` | Đọc, hiện trên màn duyệt |
| `status` | Bạn ghi khi duyệt. Đề xuất: `pending`, `active`, `rejected` |
| `is_featured` | Bạn ghi `true` / `false`. ERD đặt cờ này trên venue vì sàn mới được chọn cơ sở nổi bật |
| `createdAt` hoặc `created_at` | Đọc. Hỏi nhóm chủ sân họ đặt tên timestamp nào rồi đọc đúng tên đó |

Chưa có collection `venues` thì màn duyệt query ra mảng rỗng. Bạn không tạo schema venue, không tạo sân, ảnh, tiện ích.

Cách đọc an toàn khi chưa muốn đăng ký model Mongoose thứ hai: `mongoose.connection.collection("venues")`.

### `bookings` — nhóm đặt sân tạo

Bạn đọc khi ghi sổ:

| Field | Ý nghĩa |
|---|---|
| `venue_id` | Sang `venues` |
| `final_amount` | Doanh thu dùng để nhân `commission_rate` |
| `commission_amount` | Nhóm đặt sân có thể đã tính sẵn. Nếu field này có số, đối soát với số bạn tính. Sổ cái của bạn vẫn là `platform_transactions.amount` |
| `payment_status` | Chỉ ghi sổ khi giá trị là `paid` |
| `status` | Đơn `cancelled` thì không ghi hoa hồng mới |

Chưa có đơn `paid` thì dashboard là tổng của collection rỗng: 0 đồng, 0 dòng. Đó là dữ liệu động.

---

## 5. RBAC

### Dữ liệu trong Mongo

Seed collection `roles`:

| code | name | description |
|---|---|---|
| `ADMIN` | Quản trị hệ thống | Vào `/admin`, gán role, duyệt cơ sở, gói, sổ cái |
| `OWNER` | Chủ sân | Vào `/owner`. Nhóm chủ sân dùng code này |
| `USER` | Người dùng | App đặt sân |

`models/role.model.js` đang `uppercase: true` trên `code`. Seed đúng chữ in hoa.

Gán quyền = một document `user_roles`:

```text
{ user_id, role_id, assigned_at }
```

Một user có thể có nhiều role. Quyền lấy theo mọi `roles.code` đang gán.
Dropdown trên màn phân quyền render bằng `Role.find()`, không viết cứng ba thẻ option.

### Quyền trong code

ERD không có bảng permission. File `modules/platform/permissions.js` map từ `code` sang hành động. Thêm nút mới thì thêm một hằng. Role `ADMIN` nhận mọi hằng đó.

| Hằng | Hành động |
|---|---|
| `platform.users.read` | Xem danh sách tài khoản |
| `platform.users.assignRole` | Ghi `user_roles` |
| `platform.users.updateStatus` | Khóa / mở `users.status` |
| `platform.plans.read` | Xem gói |
| `platform.plans.write` | Tạo, sửa, ngừng bán gói |
| `platform.subscriptions.write` | Gán gói cho chủ sân |
| `platform.venues.read` | Xem cơ sở chờ duyệt |
| `platform.venues.approve` | Ghi `venues.status`, `venues.is_featured` |
| `platform.commissions.read` | Đọc `platform_transactions` |
| `platform.commissions.write` | Ghi một dòng sổ cái từ booking đã thanh toán |

`OWNER` và `USER` có mảng quyền rỗng trong map của module này. Họ không vào `/admin`.

Luồng mỗi request sau login:

1. Đọc cookie `access_token`, lấy `userId`.
2. Tải `users` đang `active`.
3. Tải `user_roles` của user đó, populate `roles.code`.
4. Không có code `ADMIN` thì đưa `OWNER` về `/owner/dashboard`, người còn lại về `/`. Không xóa cookie, vì chủ sân và khách dùng chung cookie với app của họ.
5. `authorize("platform.users.assignRole")` kiểm tra map. Thiếu quyền thì flash và về `/admin/dashboard`.

Tự gỡ role `ADMIN` của chính mình: service từ chối.
Tự khóa `status` của chính mình: service từ chối.
Hai luật này nằm trong service, validator chỉ kiểm tra id và mã hợp lệ.

---

## 6. Màn hình và query động

| URL | Đọc | Ghi |
|---|---|---|
| `GET /admin/auth/login` | Không | Không |
| `POST /admin/auth/login` | `users`, `user_roles`, `roles` | Cookie |
| `GET /admin/dashboard` | `platform_transactions` theo khoảng ngày, lookup tên venue | Không |
| `GET /admin/users` | `users`, `user_roles`, `roles` | Không |
| `POST /admin/users/:id/roles` | `roles` | Insert `user_roles` nếu chưa có cặp |
| `POST /admin/users/:id/roles/:roleId/delete` | | Xóa một `user_roles` |
| `POST /admin/users/:id/status` | | `users.status` |
| `GET /admin/plans` | `subscription_plans` | Không |
| `POST /admin/plans` | | Insert plan |
| `POST /admin/plans/:id?_method=PATCH` | | Update plan |
| `GET /admin/subscriptions` | `owner_subscriptions`, `users` có role OWNER, `subscription_plans` đang `active` | Không |
| `POST /admin/subscriptions` | Gói được chọn | Đóng gói `active` cũ của user đó, insert dòng mới |
| `GET /admin/venues` | `venues` với `status: "pending"` | Không |
| `POST /admin/venues/:id/approve?_method=PATCH` | | `venues.status = "active"` |
| `POST /admin/venues/:id/reject?_method=PATCH` | | `venues.status = "rejected"` |
| `POST /admin/venues/:id/feature?_method=PATCH` | | Đảo `is_featured` |

Dashboard nhận `req.query.range`: `7d`, `30d`, `quarter`. Service đổi thành `created_at >= from`. Pug chỉ vẽ mảng service trả về.

Tổng hoa hồng:

```javascript
db.platform_transactions.aggregate([
  { $match: { type: "commission", created_at: { $gte: from, $lte: to } } },
  { $group: { _id: "$venue_id", commission: { $sum: "$amount" }, bookings: { $sum: 1 } } }
])
```

Sau `$group`, lookup `venues` để lấy tên cơ sở và `owner_id`, rồi lookup `users` để lấy tên chủ sân. Venue đã bị nhóm kia xóa khỏi collection thì vẫn hiện số tiền, tên để `"Cơ sở không còn"`.

Hàm ghi sổ `recordFromBooking(bookingId)` nằm trong `services/commission.service.js`. Nhóm đặt sân gọi hàm này khi đơn chuyển sang `paid`. Bạn không sửa controller booking của họ. Trang dashboard không insert dữ liệu mẫu.

---

## 7. Thứ tự tầng khi code

```text
modules/platform/
  index.js
  permissions.js
  middlewares/authenticate.js
  middlewares/requirePlatformAdmin.js
  middlewares/authorize.js
  repositories/role.repository.js
  repositories/user.repository.js
  repositories/plan.repository.js
  repositories/subscription.repository.js
  repositories/venue.repository.js
  repositories/booking.repository.js
  repositories/commission.repository.js
  services/auth.service.js
  services/user.service.js
  services/plan.service.js
  services/subscription.service.js
  services/venue.service.js
  services/commission.service.js
  validators/auth.validator.js
  validators/user.validator.js
  validators/plan.validator.js
  validators/subscription.validator.js
  controllers/auth.controller.js
  controllers/user.controller.js
  controllers/plan.controller.js
  controllers/subscription.controller.js
  controllers/venue.controller.js
  controllers/dashboard.controller.js
  routes/auth.route.js
  routes/user.route.js
  routes/plan.route.js
  routes/subscription.route.js
  routes/venue.route.js
  routes/dashboard.route.js

shared/errors/AppError.js
shared/http/asyncHandler.js

models/subscription-plan.model.js
models/owner-subscription.model.js
models/platform-transaction.model.js

views/admin/pages/platform/users.pug
views/admin/pages/platform/plans.pug
views/admin/pages/platform/subscriptions.pug
views/admin/pages/platform/venues.pug
scripts/seed-platform.js
```

`venue.repository.js` và `booking.repository.js` dùng `mongoose.connection.collection(...)`. Không có `models/venue.model.js` trong phần của bạn.

Repository role và user require model sẵn:

- `models/role.model.js`
- `models/user-role.model.js`
- `models/user.model.js`

| Tầng | Việc |
|---|---|
| Route | URL + `authorize(quyền)` |
| Validator | Form rỗng, số âm, email, ObjectId |
| Controller | `req` / `res`, cookie, flash, `render` |
| Service | Luật: một gói active, không tự khóa mình, công thức hoa hồng, `balance_after` |
| Repository | Query Mongo |
| Model | Schema collection bạn sở hữu |

`index.js` gốc hiện gọi `routes/admin/index.route.js`. Khi bạn bắt đầu code, đổi lời gọi đó sang `modules/platform`. Giữ `route(app)` của client và `routeOwner(app)` của chủ sân.

Không xóa `routes/admin/facility.route.js`, `booking.route.js`, `finance.route.js`. Nhóm chủ sân đang require các file đó từ `routes/owner/index.route.js`.

`routes/admin/index.route.js` sau khi chuyển sẽ không còn được gọi. File đó đang trỏ `/admin/users` vào trang phân quyền tĩnh. Để file yên, đừng gắn lại.

---

## 8. Làm đúng thứ tự

Mỗi bước xong thì chạy app, mở URL, nhìn dữ liệu trong MongoDB Compass, rồi mới sang bước sau.

### Bước 1. Lỗi và wrapper

Tạo `shared/errors/AppError.js`.

```javascript
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
```

Tạo `shared/http/asyncHandler.js`.

```javascript
module.exports = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
```

Service `throw new AppError("...")`. Controller bắt và `req.flash`.

### Bước 2. Ba model bạn sở hữu

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

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema, "subscription_plans");
```

Tạo `models/owner-subscription.model.js`.

```javascript
const mongoose = require("mongoose");

const ownerSubscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  amount_paid: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["active", "expired", "cancelled"], required: true },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

ownerSubscriptionSchema.index({ user_id: 1, status: 1 });
ownerSubscriptionSchema.index(
  { user_id: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

module.exports = mongoose.model("OwnerSubscription", ownerSubscriptionSchema, "owner_subscriptions");
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

module.exports = mongoose.model("PlatformTransaction", platformTransactionSchema, "platform_transactions");
```

`venue_id` và `booking_id` không `ref` sang model Venue/Booking, vì hai schema đó không thuộc phần của bạn.

### Bước 3. Seed role và một admin

Tạo `scripts/seed-platform.js`. Script chỉ upsert. Không `deleteMany` trên `users`.

Việc script làm:

1. Kết nối `process.env.MONGODB_URL`.
2. Upsert 3 document trong `roles` theo `code`.
3. Upsert một user theo email trong `.env`: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PHONE`, `SEED_ADMIN_PASSWORD`. Field đúng model user: `fullName`, `email`, `phone`, `password_hash` (bcrypt), `status: "active"`.
4. Lấy `_id` role `ADMIN` và `_id` user vừa upsert. Upsert một `user_roles`. `assigned_at` = `new Date()`.

Chạy một lần: `node scripts/seed-platform.js`.

Trong Compass phải thấy collection `roles` có 3 document và `user_roles` có 1 document trỏ tới user đó.
`phone` trên `users` là unique. Trùng số thì đổi `SEED_ADMIN_PHONE`.

Chưa seed gói và chưa seed hoa hồng. Gói do bạn tạo trên màn hình. Hoa hồng chỉ xuất hiện khi có booking `paid`.

### Bước 4. Repository đọc được

`repositories/role.repository.js` dùng `models/role.model.js` và `models/user-role.model.js`.

Hàm cần có:

- `findAll()` → mọi role, sort theo `code`
- `findByCode(code)`
- `findByUserId(userId)` → `UserRole.find({ user_id }).populate("role_id").lean()`
- `assign(userId, roleId)` → `findOneAndUpdate` với `upsert: true` trên cặp `user_id` + `role_id`, set `assigned_at`
- `remove(userId, roleId)` → `deleteOne`
- `listByUserIds(ids)` → phục vụ trang danh sách

`repositories/user.repository.js`:

- `findActiveByEmail(email)` có `password_hash` để so sánh
- `findActiveById(id)` bỏ `password_hash`
- `findAll()` bỏ `password_hash`, sort `createdAt` giảm dần
- `updateStatus(id, status)`

`repositories/plan.repository.js`: `findAll`, `findById`, `create`, `updateById`.

`repositories/subscription.repository.js`:

- `findAll()` populate `user_id` (chọn `fullName email phone`) và `plan_id`
- `findActiveByUserId(userId)`
- `cancelActive(userId)` đặt mọi dòng `active` của user thành `cancelled`
- `create(data)`

`repositories/venue.repository.js`:

```javascript
const mongoose = require("mongoose");

function col() {
  return mongoose.connection.collection("venues");
}

async function findPending() {
  return col().find({ status: "pending" }).sort({ _id: -1 }).toArray();
}

async function updateStatus(id, status) {
  const { ObjectId } = mongoose.Types;
  return col().findOneAndUpdate(
    { _id: new ObjectId(id), status: "pending" },
    { $set: { status } },
    { returnDocument: "after" }
  );
}
```

`updateFeatured` đảo boolean `is_featured` của đúng `_id`.
Nếu nhóm chủ sân đặt tên field khác `status` / `is_featured` / `owner_id`, chỉ sửa file repository này.

`repositories/booking.repository.js` đọc `collection("bookings")` bằng `_id`. Trả về `null` khi chưa có document.

`repositories/commission.repository.js`:

- `findLatest()` sort `created_at: -1`
- `insert(doc)`
- `aggregateByVenue(from, to)` chạy pipeline ở mục 6

### Bước 5. Quyền, cổng, đăng nhập

Tạo `modules/platform/permissions.js` với các hằng ở mục 5 và hàm `roleHasPermission(roleCodes, permission)`. `roleCodes` là mảng vì một user có nhiều dòng `user_roles`. `ADMIN` có `Object.values` của toàn bộ hằng.

`middlewares/authenticate.js`:

- Không có cookie → redirect `/admin/auth/login`
- `jwt.verify` bằng `process.env.JWT_SECRET`
- Tải user active và các role code
- Gắn `req.user = { ...user, roleCodes }`
- Token hỏng hoặc user inactive → `clearCookie("access_token")` rồi về trang login

`middlewares/requirePlatformAdmin.js`: có `ADMIN` trong `roleCodes` thì `next()`. Có `OWNER` thì redirect `/owner/dashboard`. Còn lại redirect `/`.

`middlewares/authorize.js`: gọi `roleHasPermission`. Thiếu quyền thì flash và redirect `/admin/dashboard`.

`services/auth.service.js`:

- Tìm user active theo email
- `bcrypt.compare` với `password_hash`
- Sai email hoặc sai mật khẩu: cùng một câu `"Email hoặc mật khẩu không đúng"`
- Tải role code. Không có `ADMIN`: `AppError` 403 `"Tài khoản không thuộc quản trị hệ thống"`
- Ký JWT payload `{ id: user._id }`, hết hạn 7 ngày. Không nhét role vào token

`validators/auth.validator.js` chỉ kiểm tra email và mật khẩu tối thiểu 6 ký tự. Không gọi database.

`controllers/auth.controller.js` gọi service, ghi cookie `access_token` (`httpOnly`, `sameSite: "lax"`). Có `remember` thì `maxAge` 7 ngày, không có thì 1 giờ. Lỗi thì flash và redirect login.
`logout` xóa cookie và về login.

`routes/auth.route.js`:

- `GET /login`
- `POST /login` qua validator rồi controller
- `GET /logout`

Sửa `views/admin/pages/auth/login.pug`: `action` thành `/admin/auth/login`. Include `views/mixins/alert.pug` và gọi `+alert-error(5000)` để hiện `messages.error`.

### Bước 6. Gắn module

Tạo `modules/platform/index.js`.

Thứ tự bắt buộc:

1. `app.use(PATH, localsAdmin)` với `PATH = "/admin"`
2. `app.use(PATH + "/auth", authRoutes)` trước cổng
3. `app.use(PATH, authenticate, requirePlatformAdmin)`
4. `GET /admin` redirect `/admin/dashboard`
5. Các route nghiệp vụ gắn sau cổng

Trong `index.js` gốc, thay `routeAdmin(app)` bằng `require("./modules/platform")(app)`.

Vào `/admin/dashboard` khi chưa login thì về `/admin/auth/login`. Login bằng user đã seed thì qua được cổng. Trang dashboard chưa có route thì 404 là đúng ở bước này. Bước 11 mới gắn dashboard.

### Bước 7. Tài khoản và gán role

`services/user.service.js`:

- `list()` lấy mọi user, lấy `user_roles` theo danh sách id, trả DTO `{ ...user, roles: [{ id, code, name }] }`
- `assignRole(actorId, targetId, roleId)`: role phải tồn tại; nếu actor tự gỡ sẽ xử lý ở hàm remove; gọi `roleRepository.assign`
- `removeRole(actorId, targetId, roleId)`: nếu `actorId === targetId` và role bị gỡ có `code === "ADMIN"` thì ném `AppError`
- `changeStatus(actorId, targetId, status)`: `status` chỉ `active` hoặc `inactive`; actor không được tự đặt `inactive`

`GET /admin/users` render `views/admin/pages/platform/users.pug`.

Form trên từng dòng:

- Select role: `each role in allRoles`, value là `role._id`, submit tới `POST /admin/users/:id/roles`
- Mỗi role đang gán có nút gỡ tới `POST /admin/users/:id/roles/:roleId/delete`
- Nút khóa gửi `status` ngược với trạng thái hiện tại tới `POST /admin/users/:id/status`

`allRoles` là `Role.find()`, truyền từ controller xuống view.

Route bọc quyền:

- `GET /` → `platform.users.read`
- `POST /:id/roles` → `platform.users.assignRole`
- `POST /:id/roles/:roleId/delete` → `platform.users.assignRole`
- `POST /:id/status` → `platform.users.updateStatus`

Kiểm tra: Compass thấy document mới trong `user_roles`. Khóa user thì `users.status` đổi. Tự gỡ ADMIN của mình thì document không mất và có flash lỗi.

Header `views/admin/partials/header.pug` ở nhánh admin hiện `user.fullName`. Link thoát trỏ `/admin/auth/logout`.

Menu `views/admin/partials/sider.pug` nhánh `panelRole === "admin"` trỏ các URL thật: dashboard, users, plans, subscriptions, venues. `activeMenu` do controller truyền.

### Bước 8. Gói thuê bao

`services/plan.service.js` nhận body đã được validator ép kiểu số.

Validator từ chối `price < 0`, `duration_days < 1`, `commission_rate` ngoài 0..1.

`create` lưu đúng các field mục 3.1.
`update` không cho sửa một gói đã có người `active` theo hướng làm `commission_rate` đổi âm thầm với các hợp đồng cũ: được sửa tên, mô tả, `is_featured`, `status`. Muốn đổi giá hoặc tỷ lệ thì tạo gói mới. Các dòng `owner_subscriptions` đã chụp `amount_paid`; tỷ lệ áp vào hoa hồng đọc trên plan hiện tại của dòng `active`, nên đổi `commission_rate` của gói đang bán sẽ đổi hoa hồng của mọi chủ sân đang dùng gói đó. Vì vậy service từ chối sửa `price`, `commission_rate`, `duration_days`, `max_venues`, `max_courts` khi đã có ít nhất một `owner_subscriptions` trỏ tới `plan_id`. Chưa có ai mua thì sửa được toàn bộ.

Màn `views/admin/pages/platform/plans.pug` liệt kê `findAll()` và có form tạo. Bảng hiện `commission_rate * 100` kèm ký hiệu `%`.

Quyền: đọc `platform.plans.read`, ghi `platform.plans.write`.

### Bước 9. Gán gói cho chủ sân

`services/subscription.service.js` hàm `assign({ userId, planId, startDate })`:

1. User tồn tại, `status === "active"`.
2. User có role code `OWNER` trong `user_roles`. Không có thì `AppError` `"Chỉ gán gói cho tài khoản OWNER"`.
3. Plan tồn tại và `status === "active"`.
4. `cancelActive(userId)`.
5. `end_date` = start cộng `duration_days` ngày.
6. `amount_paid` = `plan.price`.
7. `status` = `active`.
8. `create`.

Màn subscriptions có hai dropdown động: user có role OWNER, và plan `active`. Bảng lịch sử lấy `findAll()` populate.

Quyền ghi: `platform.subscriptions.write`.

### Bước 10. Duyệt cơ sở

`services/venue.service.js`:

- `listPending()` gọi repository. Với mỗi venue, tìm user theo `owner_id` để có `fullName`. Owner không còn trong `users` thì hiện `"Chủ sân không còn"`.
- `approve(id)` và `reject(id)` chỉ cập nhật document đang `pending`. Hàm trả về rỗng thì `AppError` `"Hồ sơ không còn ở trạng thái chờ duyệt"`.
- `toggleFeatured(id)` đảo cờ.

View `views/admin/pages/platform/venues.pug` lặp `venues`. Mảng rỗng thì một câu: chưa có hồ sơ chờ duyệt.
Nút duyệt và từ chối là form POST kèm `?_method=PATCH` vì `index.js` đã bật `method-override`.

Quyền: `platform.venues.read`, `platform.venues.approve`.

Bạn không insert venue. Muốn thấy dòng trên màn này, nhóm chủ sân insert một document `status: "pending"`.

### Bước 11. Sổ cái và dashboard

`services/commission.service.js`:

```javascript
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
  if (!subscription) throw new AppError("Chủ sân chưa có gói đang chạy");

  const plan = await planRepository.findById(subscription.plan_id);
  const amount = Math.round(Number(booking.final_amount) * Number(plan.commission_rate));

  const latest = await commissionRepository.findLatest();
  const balance_after = (latest ? latest.balance_after : 0) + amount;

  return commissionRepository.insert({
    venue_id: venue._id,
    booking_id: booking._id,
    type: "commission",
    amount,
    balance_after,
    description: `Hoa hồng ${plan.commission_rate} gói ${plan.name}`,
  });
}
```

Unique `(booking_id, type)` làm lần gọi thứ hai ném lỗi trùng. Service đổi lỗi trùng thành `AppError` `"Đơn này đã ghi hoa hồng"`.

`getDashboard(range)`:

- Đổi `range` thành `from` / `to`
- `aggregateByVenue(from, to)`
- Lookup tên venue và chủ sân
- Trả `{ stats, rows }`

`stats` tính từ kết quả aggregate, ví dụ tổng `amount`, số dòng, số venue. Không khai báo sẵn `"12.480.000đ"`.

`controllers/dashboard.controller.js` đọc `req.query.range`, mặc định `7d`, render `views/admin/pages/platform/dashboard.pug`.
File pug này đang `each row in ownerCommissions`. Đổi view để `each row in rows` với field service trả về: `venueName`, `ownerName`, `bookings`, `commission`.
Khối "phí từ người dùng" trên pug cũ bỏ khỏi màn này vì ERD không có tỷ lệ phí người dùng.

Route `GET /` bọc `platform.commissions.read`.

Hàm `recordFromBooking` export để nhóm booking gọi. Chưa có route public nào tự bịa một giao dịch. Khi cần thử, insert một booking `paid` thật trong Compass rồi gọi service từ một route tạm có quyền `platform.commissions.write`, hoặc nhờ nhóm booking gọi hộ. Xong thì xóa route tạm.

---

## 9. Việc phối hợp, chốt trước khi code màn venues và hoa hồng

Gửi nhóm chủ sân:

- Collection tên `venues`
- `owner_id` là ObjectId của `users`
- `status`: `pending` khi mới gửi, bạn đổi thành `active` hoặc `rejected`
- `is_featured` là boolean, bạn là người đổi
- Tên field timestamp họ đang dùng

Gửi nhóm đặt sân:

- Collection tên `bookings`
- `payment_status` khi đã thu tiền là chuỗi `paid`
- `final_amount` là số VND
- `venue_id` trỏ `venues._id`
- Sau khi đơn `paid`, gọi `commission.service.recordFromBooking(bookingId)`
- `commission_amount` trên booking nếu họ tự lưu thì chỉ để đối soát. Sổ cái hiển thị cho admin là `platform_transactions`

Gửi nhóm auth:

- Ba `roles.code` là `ADMIN`, `OWNER`, `USER`
- Quyền vào `/admin` nhìn `user_roles`, không nhìn `users.role`

---

## 10. Kiểm tra khi làm xong

1. Compass có `roles`, `user_roles`, `subscription_plans`, `owner_subscriptions`, `platform_transactions`.
2. Không có collection mới tên `notifications`, `courts`, `vouchers`, `reviews`, `permissions` do bạn tạo.
3. `/admin/users` hết user khi bạn thêm user trong Mongo và tải lại trang.
4. Gán role xong thì có document `user_roles` mới. Dropdown có đủ role đang nằm trong `roles`.
5. Tạo một gói xong thì document nằm trong `subscription_plans`, tỷ lệ đúng số đã nhập.
6. Gán gói cho user không có role `OWNER` thì bị từ chối, không có document mới.
7. Gán gói lần hai cho cùng chủ sân thì dòng cũ thành `cancelled`, chỉ còn một dòng `active`.
8. `/admin/venues` trống khi không có `venues.status = "pending"`. Có một document pending thì hiện đúng tên trong database.
9. Dashboard đổi theo document trong `platform_transactions`. Xóa hết document thì tổng về 0, không còn số tiền viết sẵn trong code.
10. Cùng một `booking_id` ghi hoa hồng lần hai thì bị từ chối.
11. User `OWNER` mở `/admin/users` thì về `/owner/dashboard` và vẫn đăng nhập được trang chủ sân.
