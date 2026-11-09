# Bỏ sổ cái, khóa hoa hồng 5%, top 10, sửa trang tài khoản

Tài liệu để tự gõ. Không sửa source hộ. Chỉ web `/admin`. Không sửa `/owner`, app khách, model đơn, model user, model sân.

Đã đọc code đang chạy ngày 8/11/2026. Menu đang có bốn cửa: Tổng quan, Tài khoản, Sổ cái, Hoa hồng. Hoa hồng có tab Cấu hình (tỷ lệ sàn, tỷ lệ riêng, chu kỳ, hạn mức). Dashboard bên phải là tám bút toán mới nhất, bấm vào thì mở sổ cái. Trang tài khoản mỗi người vỡ thành nhiều dòng: tên một hàng, mã một hàng, nút Khóa rơi xuống hàng dưới.

Làm đúng thứ tự mục bên dưới. Mỗi file lưu xong rồi mới sang file sau. Số dòng là số dòng của file trước khi bạn sửa file đó.

---

## Kết quả khi gõ xong

| Chỗ | Trước | Sau |
|---|---|---|
| Menu | Có Sổ cái | Còn ba cửa: Tổng quan, Tài khoản, Hoa hồng |
| `/admin/ledger` | Trang sổ, xuất CSV, bút toán tay | Không còn route. Gõ URL thì 404 |
| Hoa hồng | Tab Báo cáo kỳ và tab Cấu hình | Chỉ còn bảng kỳ và nút Chốt giá |
| Tỷ lệ đơn mới | Đọc `platform_settings` rồi `owner_commission_rates` | Luôn `0.05`. Không query |
| Giá | Sửa tỷ lệ được, đơn cũ giữ tỷ lệ cũ | Đơn mới khóa `Math.round(tiền đơn × 0.05)` lúc ghi sổ |
| Dashboard, cột phải | Bút toán mới nhất | Top 10 chủ sân có tổng hoa hồng cao nhất |
| Thẻ Tổng giao dịch | Link sang sổ cái | Vẫn hiện số và GMV, không còn link chết |
| Tài khoản | Một người chiếm vài hàng, nút xuống dòng | Một người đúng một hàng. Nút nằm cùng hàng đó |

Dropdown Hàng tuần / Hai tuần / Hàng tháng trên báo cáo vẫn còn. Đó là cách chọn khoảng ngày để xem, không phải cấu hình tỷ lệ. Không lưu vào database.

---

## Việc không đụng

Giữ nguyên các file này. Xóa nhầm là đơn thanh toán không ghi được hoa hồng.

- `services/admin/ledger.service.js` — giữ file. Chỉ xóa hàm của trang sổ cái và sửa hai chỗ ghi ở mục 4
- `models/ledger-entry.model.js` — giữ. Chỉ thêm một index ở mục 5
- `models/platform-setting.model.js`
- `models/owner-rate.model.js`
- `services/app/payment.service.js` — vẫn gọi `ledger.recordPaidBooking`
- `services/owner/booking.service.js` — vẫn gọi `ledger.recordPaidBooking` và `ledger.recordRefund`
- `services/admin/user.service.js` — trang chi tiết chủ sân vẫn gọi `ledger.ownerPosition`
- `models/user.model.js`, `models/booking.model.js`, `models/facilities.model.js`
- Mọi file trong `views/owner` trừ `views/owner/partials/header.pug` ở mục 12. Nhánh chủ sân của file đó giữ nguyên

Dòng tiền vẫn nằm trong collection `ledger_entries`. Bỏ cửa Sổ cái trên menu, không bỏ sổ dưới database. Hoa hồng, chốt kỳ, hoàn tiền, số giữ hộ trên trang chi tiết chủ sân đều đọc collection đó.

Nhật ký cũ vẫn có mã `commission.rate`, `commission.ownerRate`, `ledger.adjust`. Giữ ba dòng đó trong `AUDIT_ACTIONS`. Xóa nhãn thì nhật ký hiện mã thô.

Đỗ Minh Khoa trên dữ liệu đang chạy có thể vẫn là 10% vì dòng đã ghi. Không sửa những dòng đó. Đơn thanh toán sau khi gõ xong mục 3 luôn là 5%. Cột Tỷ lệ trên báo cáo đọc `rate` đã lưu trên từng dòng, nên dòng cũ 10% vẫn hiện 10%, dòng mới hiện 5%.

---

## File xóa, làm sau mục 8

Xóa khi route sổ cái đã gỡ. Xóa trước thì server không chạy được ở bước giữa.

```text
controllers/admin/ledger.controller.js
routes/admin/ledger.route.js
validates/admin/platform-ledger.validate.js
views/admin/pages/platform/ledger.pug
```

Không xóa `public/admin/css` và `public/admin/js`. Trang chủ sân và trang tài khoản vẫn dùng.

---

## 1. `services/admin/catalog.js`

Menu. Xóa đúng object Sổ cái, từ dòng 40 đến dòng 45, kể cả dấu phẩy phía trước object Tài khoản nếu sau khi xóa còn hai dấu phẩy.

Đoạn đang có:

```javascript
  { href: "/admin/users", key: "users", icon: "bi-people", text: "Tài khoản" },
  {
    href: "/admin/ledger",
    key: "ledger",
    icon: "bi-journal-text",
    text: "Sổ cái",
  },
  {
    href: "/admin/commissions",
    key: "commissions",
    icon: "bi-percent",
    text: "Hoa hồng",
  },
```

Thành:

```javascript
  { href: "/admin/users", key: "users", icon: "bi-people", text: "Tài khoản" },
  {
    href: "/admin/commissions",
    key: "commissions",
    icon: "bi-percent",
    text: "Hoa hồng",
  },
```

`LEDGER_TYPES` giữ. Model sổ và đơn hoàn tiền còn dùng `payment`, `commission`, `refund`, `withdrawal`, `adjustment`.

`CYCLES` giữ. Báo cáo vẫn lọc theo tuần.

`AUDIT_ACTIONS` giữ nguyên cả mảng. Không thêm mã mới.

---

## 2. `routes/admin/index.route.js`

Hai dòng. Xóa dòng require sổ cái (dòng 10):

```javascript
const ledgerRoutes = require("./ledger.route");
```

Xóa dòng mount (dòng 22):

```javascript
  app.use(PATH + "/ledger", ledgerRoutes);
```

Ba dòng còn lại giữ: dashboard, users, commissions.

---

## 3. `services/admin/rate.service.js`

Thay cả file. File cũ mở hai query mỗi lần có đơn trả tiền: một query tỷ lệ riêng chủ sân, một query tỷ lệ sàn. Không còn chỗ nào được sửa tỷ lệ, nên không cần đọc database.

```javascript
const COMMISSION_RATE = 0.05;

function resolveRate() {
  return COMMISSION_RATE;
}

module.exports = { COMMISSION_RATE, resolveRate };
```

`COMMISSION_RATE` là số thực `0.05`, tức 5%. Hàm không nhận `ownerId`. `await` ở chỗ gọi cũ vẫn chạy được, nhưng mục 4 bỏ `await` cho khỏi tưởng là query.

`saveSetting`, `saveOwnerRate`, `readSetting`, `listOverrides` biến mất cùng file này. Đừng tạo lại ở file khác.

Collection `platform_settings` và `owner_commission_rates` để yên. Không có code đọc nữa thì document cũ không ảnh hưởng đơn mới.

---

## 4. `services/admin/ledger.service.js`

File này vừa ghi sổ khi thanh toán, vừa vẽ dashboard. Chỉ sửa những đoạn ghi dưới đây.

### 4.1. Đầu file

Đang require `User`, `audit`, `LEDGER_TYPES`, `LEDGER_CODES`. Bốn thứ đó chỉ phục vụ trang sổ cái và form điều chỉnh. Sau khi xóa hàm ở mục 4.3 thì bỏ luôn, kẻo file còn tên không ai gọi.

Thay khối require (dòng 1–18) bằng:

```javascript
const Venue = require("../../models/facilities.model");
const Ledger = require("../../models/ledger-entry.model");
const { ServiceError } = require("./auth.service");
const rate = require("./rate.service");
const { formatVnd, percentLabel } = require("./present");
const {
  ROLES,
  CHARTS,
  byCode,
  startOfDay,
  startOfWeek,
  startOfMonth,
  addUnit,
} = require("./catalog");
```

Xóa dòng 20:

```javascript
const PAGE_SIZE = 12;
```

`nextCode` (dòng 22–24) giữ. `appendLine` vẫn dùng để sinh mã `LG...`.

Xóa `typeLabel` (dòng 26–29). Chỉ `presentRow` của trang sổ cái gọi nó.

### 4.2. Khóa 5% lúc ghi đơn

Trong `recordPaidBooking`, dòng 77 đang là:

```javascript
  const share = await rate.resolveRate(ownerId);
```

Đổi thành:

```javascript
  const share = rate.resolveRate();
```

Ba dòng ngay dưới giữ nguyên. Chúng là chỗ chốt giá:

```javascript
  const amount = Math.round(Number(booking.amount) || 0);
  const fee = Math.round(amount * share);
```

`amount` là tiền đơn. `share` là `0.05`. `fee` là hoa hồng, làm tròn đồng. Dòng `commission` phía dưới đã ghi `amount: fee` và `rate: share`. Không thêm field mới. Ghi chú `Hoa hồng ${percentLabel(share)}` tự thành `Hoa hồng 5%`.

Đơn đã có dòng `payment` thì hàm return sớm ở dòng 71. Gõ lại file không tính lại đơn cũ.

### 4.3. Xóa phần chỉ để vẽ trang sổ cái

Xóa từ `function readQuery` đến hết `async function adjust` (dòng 198–332). Gồm:

| Hàm | Vì sao xóa |
|---|---|
| `readQuery` | Chỉ lọc trang `/admin/ledger` |
| `presentRow` | Chỉ đổi một dòng sổ thành chữ cho bảng và CSV |
| `list` | Danh sách sổ, kèm query toàn bộ user để đổ dropdown |
| `csv` | Xuất file |
| `adjust` | Bút toán tay. Không còn form thì không còn đường ghi |

Giữ nguyên, đúng thứ tự, các hàm này:

`appendLine`, `recordPaidBooking`, `recordRefund`, `marksOf`, `isVoid`, `isSettled`, `commissionState`, `ownerPosition`, `countOf`, `chartBuckets`, `paintBuckets`, `dashboard`, `linesForOwner`.

`recordRefund` vẫn ghi dòng hoàn tiền và một dòng điều chỉnh âm. Đó là hủy đơn, không phải form sổ cái.

### 4.4. Thay `recent` trong `dashboard` bằng top 10

Trong `Ledger.aggregate`, facet `recent` (dòng 464–476) đang sort cả sổ rồi lấy 8 dòng mới nhất, mỗi dòng lookup user. Xóa cả facet đó.

Thêm facet này vào cùng `$facet`, ngang hàng với `entries`, `gmv`, `monthFee`, `collected`, `chart`:

```javascript
          topFees: [
            { $match: { type: "commission", owner_id: { $ne: null } } },
            { $group: { _id: "$owner_id", total: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                pipeline: [{ $project: { fullName: 1 } }],
                as: "owner",
              },
            },
          ],
```

Một vòng aggregate, group theo chủ sân, sort giảm dần, cắt 10, rồi mới lookup tên. Không kéo dòng thanh toán, hoàn tiền, rút tiền vào bảng này.

Trong object return của `dashboard`, thẻ thứ ba đang là:

```javascript
      {
        href: "/admin/ledger",
        icon: "bi-journal-text",
        label: "Tổng giao dịch",
        value: String(countOf(books.entries, "n")),
        note: `GMV ${formatVnd(countOf(books.gmv, "total"))}`,
      },
```

Bỏ `href`. Thẻ còn số, không dẫn tới route đã xóa:

```javascript
      {
        icon: "bi-journal-text",
        label: "Tổng giao dịch",
        value: String(countOf(books.entries, "n")),
        note: `GMV ${formatVnd(countOf(books.gmv, "total"))}`,
      },
```

Ba thẻ kia giữ `href`.

Cuối hàm, đang return `recent: books.recent.map(...)`. Xóa `recent`. Thêm:

```javascript
    topFees: (books.topFees || []).map((row, index) => ({
      rank: index + 1,
      name: row.owner[0] ? row.owner[0].fullName : "Chủ sân không còn",
      amountLabel: formatVnd(row.total),
    })),
```

`rank` là 1 đến 10. `name` là `users.fullName`. `amountLabel` là tổng `amount` của mọi dòng `type: "commission"` của chủ sân đó, đã format VND. Dòng hoa hồng đã ghi bao nhiêu thì cộng bấy nhiêu, kể cả dòng cũ không phải 5%.

### 4.5. `module.exports`

Đang export `list`, `csv`, `adjust`. Xóa ba tên đó. Phần export còn:

```javascript
module.exports = {
  appendLine,
  recordPaidBooking,
  recordRefund,
  marksOf,
  isVoid,
  isSettled,
  commissionState,
  ownerPosition,
  dashboard,
  linesForOwner,
};
```

---

## 5. `models/ledger-entry.model.js`

Thêm một dòng ngay trước `module.exports` (sau index `owner_id` ở dòng 46):

```javascript
schema.index({ type: 1, owner_id: 1 });
```

Top 10 lọc `type` rồi group `owner_id`. Index này đúng cặp đó. Các index cũ giữ.

---

## 6. `services/admin/commission.service.js`

### 6.1. Bỏ require không còn dùng

Dòng 5:

```javascript
const rate = require("./rate.service");
```

Xóa. Không còn `readSetting`.

### 6.2. Xóa hai hàm chỉ để vẽ tab Cấu hình

Xóa `presentSetting` (dòng 137–143) và `presentOverrides` (dòng 145–150).

### 6.3. Thay `page`

Hàm `page` (dòng 152–181) đang rẽ `tab === "config"` rồi query chủ sân và tỷ lệ riêng. Thay cả hàm:

```javascript
async function page(query) {
  const period = periodOf(query, "weekly");
  return {
    period,
    cycles: CYCLES,
    rows: await report(period),
  };
}
```

`periodOf` đã có sẵn. Có `from` và `to` trên query thì dùng đúng ngày đó. Không có thì lùi theo `cycle`. Không gửi `cycle` thì rơi về `weekly` vì đối số thứ hai là `"weekly"`.

`report` và `reportRow` giữ. Cột tỷ lệ vẫn là `rateLabelOf`: một mức thì hiện `5%` hoặc `10%` đúng số đã ghi, nhiều mức thì hiện `Nhiều mức`.

### 6.4. Chốt giá, không chặn hạn mức

Trong `closePeriod`:

Xóa dòng 193:

```javascript
  const setting = await rate.readSetting();
```

Xóa hàm `assertMin` (dòng 183–187) và hai lời gọi (dòng 223–224):

```javascript
  assertMin(debt, setting.minPayout, "Hoa hồng tiền mặt");
  assertMin(payout, setting.minPayout, "Tiền giữ hộ chủ sân");
```

Phần còn lại của `closePeriod` giữ: còn công nợ tiền mặt thì ghi `adjustment`, còn tiền giữ hộ thì ghi `withdrawal`, rồi `audit.write` với mã `commission.close`.

Ý nghĩa của nút: số hoa hồng đã khóa trên từng đơn từ lúc thanh toán. Bấm chốt chỉ ghi nhận kỳ đó đã xong. Không còn hạn mức 1.000.000đ, vì hạn mức là cấu hình vừa bỏ. Kỳ không còn khoản mở thì vẫn báo `Kỳ này không còn khoản chưa chốt`.

`module.exports` vẫn là `{ page, closePeriod }`.

---

## 7. Hoa hồng: controller, route, validate

### 7.1. `controllers/admin/commission.controller.js`

Thay cả file. Hết `save`, hết `ownerRate`, hết query `?tab=config`.

```javascript
const asyncHandler = require("../../middlewares/admin/async-handler");
const commission = require("../../services/admin/commission.service");
const { ServiceError } = require("../../services/admin/auth.service");

function fail(req, res, error) {
  const message =
    error instanceof ServiceError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect("/admin/commissions");
}

const index = asyncHandler(async (req, res) => {
  const data = await commission.page(req.query);
  res.render("admin/pages/platform/commissions", {
    pageTitle: "Hoa hồng",
    activeMenu: "commissions",
    ...data,
  });
});

const close = asyncHandler(async (req, res) => {
  try {
    await commission.closePeriod(req.user._id, req.body);
    req.flash("success", "Đã chốt giá kỳ này");
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

module.exports = { index, close };
```

### 7.2. `routes/admin/commission.route.js`

Thay cả file:

```javascript
const express = require("express");
const controller = require("../../controllers/admin/commission.controller");
const validate = require("../../validates/admin/platform-commission.validate");

const router = express.Router();

router.get("/", controller.index);
router.post("/close", validate.close, controller.close);

module.exports = router;
```

`POST /admin/commissions/settings` và `POST /admin/commissions/owner-rates` hết. Form cũ nếu còn sót sẽ 404, đúng, vì không còn màn cấu hình.

### 7.3. `validates/admin/platform-commission.validate.js`

Thay cả file. Chỉ còn kiểm tra nút chốt: có id chủ sân, có ngày đầu, có ngày cuối.

```javascript
const mongoose = require("mongoose");

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

module.exports = { close };
```

---

## 8. `views/admin/pages/platform/commissions.pug`

Thay cả file. Hết tab, hết form tỷ lệ, hết form tỷ lệ riêng.

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
      p.pf-sub Hoa hồng cố định 5%. Giá khóa lúc đơn thanh toán. Bấm Chốt giá để khóa kỳ.

  form.pf-filters(method="get" action="/admin/commissions")
    select.sz-select(name="cycle")
      each item in cycles
        option(value=item.code selected=period.cycle === item.code)= item.label
    input.sz-input(type="date" name="from" value=period.fromInput)
    input.sz-input(type="date" name="to" value=period.toInput)
    button.sz-btn.sz-btn-dark(type="submit") Xem kỳ

  section.sz-card.sz-panel
    if rows.length
      p.sz-panel-sub #{rows.length} chủ sân có phát sinh từ #{period.fromInput} đến #{period.toInput}.
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
                  form(method="post" action="/admin/commissions/close" data-confirm=`Chốt giá kỳ này của ${row.ownerName}?`)
                    input(type="hidden" name="ownerId" value=row.ownerId)
                    input(type="hidden" name="from" value=period.fromInput)
                    input(type="hidden" name="to" value=period.toInput)
                    input(type="hidden" name="cycle" value=period.cycle)
                    button.sz-btn.sz-btn-green.sz-btn-sm(type="submit") Chốt giá
    else
      .pf-empty
        strong Chưa có hoa hồng trong kỳ
        p Khi có đơn đã thanh toán, chọn lại kỳ rồi tải lại trang.

block script
  script(src="/admin/js/platform.js")
```

`setting` không còn trong view. Pug không được gọi `setting.rateLabel`. Câu dưới tiêu đề viết thẳng `5%`.

Nút đổi chữ thành `Chốt giá`. Form vẫn post `/admin/commissions/close` với `ownerId`, `from`, `to`, `cycle`.

Xong mục này thì xóa bốn file ở mục "File xóa".

---

## 9. `controllers/admin/platform-dashboard.controller.js`

Nhánh lỗi (dòng 16–24) vẫn gửi `recent: []`. View mới đọc `topFees`. Đổi thành:

```javascript
    return res.render("admin/pages/platform/dashboard", {
      pageTitle: "Tổng quan sàn",
      activeMenu: "dashboard",
      cards: [],
      chart: { code: range, totalLabel: "0 ₫", buckets: [] },
      charts: [],
      topFees: [],
      loadError: "Không đọc được số liệu. Kiểm tra kết nối MongoDB.",
    });
```

Nhánh thành công giữ nguyên. `dashboard()` đã trả `topFees`.

---

## 10. `views/admin/pages/platform/dashboard.pug`

### 10.1. Thẻ không có link

Dòng 19–24 đang bọc mọi thẻ trong `a.pf-stat`. Thẻ Tổng giao dịch không còn `href`. Đổi thành mixin để chữ thẻ chỉ viết một lần:

Xóa:

```pug
    .pf-stats
      each card in cards
        a.pf-stat(href=card.href)
          i.bi(class=card.icon)
          span.pf-stat-label= card.label
          strong.pf-stat-value= card.value
          span.pf-stat-note= card.note
```

Dán:

```pug
    mixin stat(card)
      i.bi(class=card.icon)
      span.pf-stat-label= card.label
      strong.pf-stat-value= card.value
      span.pf-stat-note= card.note

    .pf-stats
      each card in cards
        if card.href
          a.pf-stat(href=card.href)
            +stat(card)
        else
          .pf-stat
            +stat(card)
```

Có `href` thì là link. Không có thì là khối thường, cùng class `pf-stat`.

### 10.2. Cột phải

Xóa cả `section` từ `h2.sz-panel-title Bút toán mới nhất` đến hết `else` của `recent` (dòng 48–97), gồm mọi `dialog`. Đó là cửa sổ cái thu nhỏ.

Dán:

```pug
      section.sz-card.sz-panel
        .pf-split-head
          h2.sz-panel-title Top 10 hoa hồng cao nhất
          a(href="/admin/commissions") Xem đối soát
        if topFees.length
          each item in topFees
            .pf-order
              strong #{item.rank}. #{item.name}
              span= item.amountLabel
        else
          .pf-empty
            strong Chưa có hoa hồng.
            p Đơn đã thanh toán sẽ hiện chủ sân ở đây.
```

Không mã `LG...`, không loại bút toán, không số dư, không hộp thoại. Một hàng: thứ hạng, tên chủ sân, tổng hoa hồng.

Xóa luôn cuối file:

```pug
block script
  script(src="/admin/js/platform.js")
```

Trang này không còn `data-open` và không còn `data-confirm`. `platform.js` còn cần ở trang tài khoản và trang hoa hồng.

---

## 11. Trang tài khoản: một người, một hàng

Ảnh hiện tại mỗi tài khoản bị xé. Tên một dòng, sáu ký tự id một dòng, email một dòng, số điện thoại một dòng, cụm nút một dòng, nút Khóa rơi xuống dòng nữa. `dialog` lại nằm trong `tbody`, cùng vòng `each` với `tr`, nên trình duyệt kéo cao hàng.

Việc cần: trong bảng chỉ còn `tr`. Hộp thoại để sau bảng. Thông tin một người nằm trong ô đầu. Năm nút nằm một hàng, không xuống dòng.

### 11.1. `views/admin/pages/platform/users.pug`

Câu trang nhật ký trống (dòng 40–41) đang nhắc đổi tỷ lệ. Đổi thành:

```pug
          strong Chưa có thao tác
          p Khóa tài khoản hoặc đổi vai trò sẽ hiện ở đây.
```

Trong nhánh danh sách, xóa từ `section.sz-card.sz-panel` (dòng 56) đến hết `dialog#dialog-create` (dòng 180). Dán khối sau. Form lọc phía trên giữ nguyên.

```pug
    section.sz-card.sz-panel
      if users.length
        .pf-users
          table.sz-table
            thead
              tr
                th Tài khoản
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
                        .pf-line
                          a(href=`/admin/users/${u._id}`)
                            strong= u.fullName
                          small= String(u._id).slice(-6).toUpperCase()
                        small.sz-muted #{u.email} · #{u.phone}
                  td
                    span.sz-role(class=`role-${String(u.role || "user").toLowerCase()}`)= roleItem ? roleItem.label : u.role
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

        nav.pf-pager
          if page > 1
            a(href=`/admin/users?page=${page - 1}&q=${encodeURIComponent(q)}&role=${role}&status=${status}`) Trước
          span Trang #{page} / #{pages} · #{total} tài khoản
          if page < pages
            a(href=`/admin/users?page=${page + 1}&q=${encodeURIComponent(q)}&role=${role}&status=${status}`) Sau

        each u in users
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
                    strong= item.label
                    small= item.code
              .pf-dialog-actions
                button.sz-btn(type="button" data-close) Hủy
                button.sz-btn.sz-btn-green(type="submit") Lưu thay đổi
      else
        .pf-empty
          strong Không có tài khoản
          p Không có tài khoản khớp bộ lọc.

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
        label Vai trò
        select.sz-select(name="role" required)
          each item in roles
            option(value=item.code selected=item.code === "USER") #{item.label}
        .pf-dialog-actions
          button.sz-btn(type="button" data-close) Hủy
          button.sz-btn.sz-btn-green(type="submit") Tạo tài khoản
```

Ô Tài khoản là một người: avatar, tên và sáu ký tự cuối của `_id` cùng một dòng, email và điện thoại cùng dòng dưới. Hết cột Liên hệ riêng. Route tạo, sửa, đổi vai trò, mật khẩu, khóa giữ nguyên URL đang có trong `routes/admin/user.route.js`. Không thêm nút xóa user.

`each` thứ hai chỉ để render `dialog`, nằm ngoài `table`. Id hộp thoại vẫn là `edit-`, `pass-`, `role-` cộng `_id`, khớp `data-open` trên nút.

### 11.2. `views/admin/pages/platform/user-detail.pug`

Một câu, dòng 65:

```pug
        p Chưa có thao tác khóa, đổi vai trò hay đổi tỷ lệ trên tài khoản này.
```

Đổi thành:

```pug
        p Chưa có thao tác khóa hoặc đổi vai trò trên tài khoản này.
```

Phần số giữ hộ và công nợ hoa hồng của chủ sân giữ. Đó là `ownerPosition`, không phải trang sổ cái.

### 11.3. `public/admin/css/platform.css`

`.pf-actions` (dòng 153–158) đang `flex-wrap: wrap`. Đó là lý do nút Khóa rơi hàng. Đổi thành:

```css
.pf-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  align-items: center;
}
```

`.pf-actions form` phía dưới giữ.

`.pf-stat:hover` làm mọi thẻ nhích lên. Thẻ Tổng giao dịch không phải link, không nên nhích. Thêm ngay sau rule `.pf-stat:hover`:

```css
.pf-stat:not(a):hover {
  border-color: var(--line);
  transform: none;
}
```

Cuối file, thêm khối cho bảng tài khoản. `min-width: 920px` giữ một hàng đủ chỗ cho năm nút. Màn hẹp thì `.pf-users` cuộn ngang trong thẻ, không bóp chữ xuống dòng và không đè sidebar.

```css
.pf-users {
  overflow-x: auto;
}
.pf-users .sz-table {
  min-width: 920px;
}
.pf-users th,
.pf-users td {
  white-space: nowrap;
  vertical-align: middle;
}
.pf-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.pf-line small {
  color: #94a3b8;
  font-weight: 700;
}
.pf-line a {
  color: inherit;
  text-decoration: none;
}
.pf-line a:hover strong {
  color: #047857;
}
```

`.pf-person strong, .pf-person small { display: block }` vẫn đúng với dòng email. `.pf-line small` là `inline` theo rule mới, nên mã sáu ký tự đứng cạnh tên, không thành hàng thứ hai.

---

## 12. `views/owner/partials/header.pug`

Chỉ nhánh `panelRole === "admin"` (dòng 11–19). Nhánh `else` của chủ sân không sửa.

Đang hiện hai lần chữ Super Admin: viên thuốc một cục, tên tài khoản một cục. Tài khoản đăng nhập trong ảnh có `fullName` đúng là Super Admin, nên nhìn như hai tài khoản.

Thay nhánh admin bằng một khối:

```pug
      if panelRole === "admin"
        .sz-user
          div
            .sz-user-name= user && user.fullName ? user.fullName : "Quản trị"
            .sz-user-sub Super Admin · Quản trị hệ thống
        a.pf-logout(href="/admin/auth/logout") Thoát
```

Một tên. Dòng dưới ghi vai trò. Nút Thoát giữ link `/admin/auth/logout`.

---

## Việc không làm thêm

- Không viết trang sổ cái mới.
- Không thêm API sửa tỷ lệ.
- Không cập nhật `rate` của dòng `ledger_entries` đã có.
- Không xóa user.
- Không đổi công thức hoàn tiền.
- `scripts/seed-admin-test.js` vẫn tạo `OwnerRate` 10% cho một user test. Script không chạy cùng web. Có thể bỏ đoạn đó khi seed lại, không bắt buộc. Web không đọc bảng đó nữa.

---

## Tự kiểm sau khi gõ

1. Menu còn Tổng quan, Tài khoản, Hoa hồng. Không còn chữ Sổ cái.
2. `/admin/ledger` không mở được trang.
3. `/admin/commissions` không còn tab Cấu hình, không còn ô tỷ lệ, không còn form chủ sân. Có bảng và nút Chốt giá.
4. Tạo một đơn trả tiền mới. Dòng `commission` trong `ledger_entries` có `rate: 0.05` và `amount` bằng tiền đơn nhân 0.05, làm tròn đồng. Chủ sân từng được set 10% cũng ra 5% trên đơn này.
5. Dashboard cột phải có tối đa 10 tên, số lớn đứng trên. Không có mã `LG`. Link Xem đối soát ra `/admin/commissions`.
6. Thẻ Tổng giao dịch không đưa sang sổ cái.
7. `/admin/users`: mỗi người một hàng. Tên, email, điện thoại, vai trò, trạng thái, ngày, năm nút cùng nhìn thấy trên hàng đó. Bấm Sửa, Đổi vai trò, Mật khẩu vẫn mở hộp. Khóa vẫn hỏi xác nhận.
8. Thanh trên chỉ một tên tài khoản đang đăng nhập.
