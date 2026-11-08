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
  {
    href: "/admin/dashboard",
    key: "dashboard",
    icon: "bi-grid",
    text: "Tổng quan sàn",
  },
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
