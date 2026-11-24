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
      {
        href: "/admin/audit",
        key: "audit",
        icon: "bi-journal-text",
        text: "Nhật ký thao tác",
        permission: "audit_log:view",
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
      {
        href: "/admin/ledger",
        key: "ledger",
        icon: "bi-journal-bookmark",
        text: "Sổ cái",
        permission: "ledger:view",
      },
    ],
  },
];

const PERMISSION_GROUPS = {
  dashboard: "Tổng quan",
  user: "Tài khoản",
  role: "Vai trò",
  commission: "Hoa hồng",
  ledger: "Sổ cái",
  audit_log: "Nhật ký thao tác",
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
  "ledger:view",
  "ledger:adjust",
  "audit_log:view",
];

function visibleMenu(can) {
  return ADMIN_MENU.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);
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
  visibleMenu,
};
