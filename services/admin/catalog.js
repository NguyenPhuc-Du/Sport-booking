const ROLES = [
  { code: "SUPER_ADMIN", label: "Quản trị cao nhất" },
  { code: "ADMIN", label: "Quản trị" },
  { code: "OWNER", label: "Chủ sân" },
  { code: "USER", label: "Khách hàng" },
];

const STATUSES = [
  { code: "active", label: "Hoạt động" },
  { code: "inactive", label: "Đã khóa" },
];

const LEDGER_TYPES = [
  { code: "payment", label: "Thanh toán", icon: "bi-cash-coin" },
  { code: "commission", label: "Hoa hồng", icon: "bi-percent" },
  { code: "refund", label: "Hoàn tiền", icon: "bi-arrow-counterclockwise" },
  { code: "withdrawal", label: "Rút tiền", icon: "bi-box-arrow-up" },
  { code: "adjustment", label: "Điều chỉnh", icon: "bi-arrow-left-right" },
];

// Mỗi trang sổ cái hiện bao nhiêu dòng. Đổi số này là cả phân trang đổi theo.
const LEDGER_PAGE_SIZE = 8;

// Câu nhỏ dưới số tiền. Khóa là hướng tiền, không phải mã loại giao dịch.
const LEDGER_FLOW_LABEL = {
  in: "Quỹ tăng",
  out: "Quỹ giảm",
  flat: "Không đổi quỹ",
};

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
  {
    title: "PHÂN HỆ QUẢN TRỊ",
    items: [
      {
        href: "/admin/dashboard",
        key: "dashboard",
        icon: "bi-grid",
        text: "Tổng quan sàn",
        permission: "dashboard:view",
      },
      {
        href: "/admin/users",
        key: "users",
        icon: "bi-people",
        text: "Tất cả tài khoản",
        permission: "user:view",
      },
      {
        href: "/admin/users?role=OWNER",
        key: "users-owner",
        icon: "bi-building",
        text: "Chủ sân",
        permission: "user:view",
      },
      {
        href: "/admin/users?role=USER",
        key: "users-user",
        icon: "bi-person",
        text: "Khách hàng",
        permission: "user:view",
      },
      {
        href: "/admin/roles",
        key: "roles",
        icon: "bi-shield-lock",
        text: "Vai trò & Phân quyền",
        permission: "role:manage",
      },
    ],
  },
  {
    title: "TÀI CHÍNH SÀN",
    items: [
      {
        href: "/admin/commissions",
        key: "commissions",
        icon: "bi-percent",
        text: "Hoa hồng",
        permission: "commission:view",
      },
    ],
  },
];

const PERMISSION_GROUPS = {
  dashboard: { label: "Tổng quan", icon: "bi-grid" },
  user: { label: "Tài khoản", icon: "bi-people" },
  role: { label: "Vai trò", icon: "bi-shield-lock" },
  commission: { label: "Hoa hồng", icon: "bi-percent" },
  ledger: { label: "Sổ cái", icon: "bi-journal-bookmark" },
};

// Hậu tố sau dấu hai chấm. Những hậu tố này là quyền nhạy cảm trên mọi nhóm.
const DANGEROUS_ACTIONS = ["delete", "adjust", "change_role", "manage", "override"];

// Câu giải thích ngắn, chỉ cho quyền nhạy cảm. Tên quyền lấy từ mô tả trong database.
const PERMISSION_CAUTION = {
  "user:change_role": "Đổi vai trò làm đổi toàn bộ việc người đó được làm.",
  "user:delete": "Xóa dữ liệu thì khó lấy lại.",
  "ledger:adjust": "Dòng đã ghi không sửa và không xóa được.",
  "role:manage": "Người này có thể trao hoặc gỡ quyền của người khác.",
  "system:override": "Quyền này đụng tới tài khoản quản trị cao nhất.",
};

const ADMIN_PERMISSION_CODES = [
  "dashboard:view",
  "user:view",
  "user:create",
  "user:update",
  "user:lock",
  "user:reset_password",
  "user:change_role",
  "role:manage",
  "system:override",
  "commission:view",
  "commission:update",
  "commission:payments",
  "commission:reconcile",
  "commission:report",
  "account:profile",
];

function visibleMenu(can) {
  return ADMIN_MENU.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);
}

// Lấy phần sau dấu hai chấm của mã quyền. Vào: "user:view". Ra: "view".
function permissionAction(code) {
  const text = String(code || "");
  const cut = text.indexOf(":");
  return cut === -1 ? "" : text.slice(cut + 1);
}

// Nhóm hiển thị của một mã quyền. "system" gom vào nhóm Vai trò vì đó là quyền của vai trò.
function permissionGroupKey(code) {
  const resource = String(code || "").split(":")[0];
  if (resource === "system") return "role";
  return resource || "other";
}

// Gắn tên, câu mô tả, cờ nhạy cảm cho một quyền lấy từ database.
// Vào: { code, description, checked }. Ra: object đủ cho trang vai trò. Gọi khi dựng trang chi tiết.
function decoratePermission(item) {
  const code = String(item.code || "");
  const action = permissionAction(code);
  const description = String(item.description || "").trim();
  const groupKey = item.group || permissionGroupKey(code);
  const group = PERMISSION_GROUPS[groupKey] || { label: groupKey, icon: "bi-dot" };
  return {
    code,
    description,
    label: String(item.name || description || code),
    sentence: description,
    caution: PERMISSION_CAUTION[code] || (action === "delete" ? PERMISSION_CAUTION["user:delete"] : ""),
    dangerous: Boolean(item.isSensitive) || DANGEROUS_ACTIONS.includes(action),
    checked: Boolean(item.checked),
    group: groupKey,
    groupLabel: group.label,
    icon: group.icon,
  };
}

// Danh sách menu phẳng để trang vai trò nói "vai trò này thấy gì". Lấy từ ADMIN_MENU, không chép tay.
function menuEntries() {
  const rows = [];
  ADMIN_MENU.forEach((group) => {
    group.items.forEach((item) => {
      rows.push({ text: item.text, icon: item.icon, permission: item.permission });
    });
  });
  return rows;
}

const AUDIT_ACTIONS = [
  { code: "user.create", label: "Tạo tài khoản" },
  { code: "user.update", label: "Sửa tài khoản" },
  { code: "user.role", label: "Đổi vai trò" },
  { code: "user.status", label: "Khóa hoặc mở khóa" },
  { code: "user.password", label: "Đặt lại mật khẩu" },
  { code: "auth.login", label: "Đăng nhập admin" },
  { code: "role.create", label: "Tạo vai trò" },
  { code: "role.update", label: "Sửa vai trò" },
  { code: "role.delete", label: "Xóa vai trò" },
  { code: "role.permissions", label: "Đổi quyền của vai trò" },

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
  ADMIN_PERMISSION_CODES,
  PERMISSION_GROUPS,
  DANGEROUS_ACTIONS,
  LEDGER_PAGE_SIZE,
  LEDGER_FLOW_LABEL,
  visibleMenu,
  permissionAction,
  permissionGroupKey,
  decoratePermission,
  menuEntries,
};
