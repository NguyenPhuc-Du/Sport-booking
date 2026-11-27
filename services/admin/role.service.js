const Role = require("../../models/role.model");
const Permission = require("../../models/permission.model");
const RolePermission = require("../../models/role-permission.model");
const UserRole = require("../../models/user-role.model");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const {
  ADMIN_PERMISSION_CODES,
  PERMISSION_GROUPS,
  decoratePermission,
  menuEntries,
  permissionGroupKey,
} = require("./catalog");
const policy = require("./rbac-policy");
const rbac = require("./rbac.service");
const { vaiTroLuuUser } = require("./user.service");
const { huyCache, nho, PHIEN_MS } = require("./bo-nho");

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,40}$/;

function readRole(body, withCode) {
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  if (!name) throw new ServiceError("Nhập tên vai trò");
  if (!withCode) return { name, description };
  const code = String(body.code || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    throw new ServiceError("Mã vai trò viết hoa, dùng chữ, số và dấu gạch dưới");
  }
  return { code, name, description };
}

function asList(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map(String);
}

// Sắp mã quyền theo thứ tự trong catalog. Mã lạ đứng cuối. Vào: mảng mã. Ra: mảng mã đã sắp.
function sortCodes(codes) {
  const rank = new Map(ADMIN_PERMISSION_CODES.map((code, index) => [code, index]));
  return [...codes].sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

// Lấy tối đa 4 tên quyền để hiện trên thẻ vai trò. Tên lấy từ mô tả trong database.
function highlightsOf(codes, labelOf) {
  const labels = sortCodes(codes).map((code) => labelOf.get(code) || code);
  return { highlights: labels.slice(0, 4), more: Math.max(labels.length - 4, 0) };
}

async function mustFind(id) {
  const role = await Role.findById(id);
  if (!role) throw new ServiceError("Không có vai trò này");
  return role;
}

async function choices() {
  const rows = await Role.find().select("code name").sort({ name: 1 }).lean();
  return rows.map((row) => ({ _id: row._id, code: row.code, label: row.name }));
}

async function list() {
  return nho("roles", PHIEN_MS, docDanhSachVaiTro);
}

async function docDanhSachVaiTro() {
  const [roles, counts, links, permissions] = await Promise.all([
    Role.find().sort({ is_system: -1, name: 1 }).lean(),
    UserRole.aggregate([{ $group: { _id: "$role_id", total: { $sum: 1 } } }]),
    RolePermission.find().select("role_id permission_id").lean(),
    Permission.find().select("code description").lean(),
  ]);
  const totalOf = new Map(counts.map((row) => [String(row._id), row.total]));
  const codeOf = new Map(permissions.map((item) => [String(item._id), item.code]));
  const labelOf = new Map(permissions.map((item) => [item.code, item.description || item.code]));
  const codesOf = new Map();
  links.forEach((link) => {
    const key = String(link.role_id);
    const code = codeOf.get(String(link.permission_id));
    if (!code) return;
    if (!codesOf.has(key)) codesOf.set(key, []);
    codesOf.get(key).push(code);
  });
  return roles.map((role) => ({
    ...role,
    userCount: totalOf.get(String(role._id)) || 0,
    kind: role.is_system ? "Hệ thống" : "Tùy chỉnh",
    ...highlightsOf(codesOf.get(String(role._id)) || [], labelOf),
  }));
}

async function matrix(roleId) {
  const role = await Role.findById(roleId).lean();
  if (!role) throw new ServiceError("Không có vai trò này");
  const permissions = await Permission.find().sort({ code: 1 }).lean();
  const owned = new Set(await rbac.permissionsOfRole(role._id));
  const buckets = new Map();

  permissions.forEach((item) => {
    if (String(item.code || "").startsWith("ledger:")) return;
    const view = decoratePermission({ ...item, checked: owned.has(item.code) });
    const key = permissionGroupKey(item.code);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(view);
  });

  const userCount = await UserRole.countDocuments({ role_id: role._id });
  const order = Object.keys(PERMISSION_GROUPS);
  const groups = [...buckets.entries()]
    .map(([key, items]) => {
      const meta = PERMISSION_GROUPS[key] || { label: key, icon: "bi-dot" };
      return { key, label: meta.label, icon: meta.icon, items };
    })
    .sort((a, b) => {
      const ia = order.indexOf(a.key);
      const ib = order.indexOf(b.key);
      return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib);
    });
  return {
    role,
    userCount,
    groups,
    menu: menuEntries(),
    groupOrder: order,
    permissionTotal: permissions.length,
  };
}

async function create(actorId, body, ip) {
  const input = readRole(body, true);
  const existed = await Role.findOne({ code: input.code }).lean();
  if (existed) throw new ServiceError("Mã vai trò đã có");
  const role = await Role.create({ ...input, is_system: false, is_protected: false });
  huyCache();
  return role;
}

async function update(actorId, roleId, body, ip) {
  const role = await mustFind(roleId);
  const actor = await rbac.accessOf(actorId);
  policy.assertCanTouchProtected(actor.permissions, role.is_protected);
  const input = readRole(body, false);
  role.name = input.name;
  role.description = input.description;
  await role.save();
  huyCache();
}

async function savePermissions(actorId, roleId, rawCodes, ip) {
  const role = await mustFind(roleId);
  const actor = await rbac.accessOf(actorId);
  policy.assertCanTouchProtected(actor.permissions, role.is_protected);

  const wanted = asList(rawCodes);
  policy.assertCanGrant(actor.permissions, wanted);
  const known = await Permission.find({ code: { $in: wanted } }).lean();
  if (known.length !== wanted.length) throw new ServiceError("Có mã quyền không tồn tại");

  await RolePermission.deleteMany({ role_id: role._id });
  if (known.length) {
    await RolePermission.insertMany(
      known.map((item) => ({ role_id: role._id, permission_id: item._id })),
    );
  }
  const holders = await UserRole.find({ role_id: role._id }).select("user_id").lean();
  const ids = holders.map((row) => row.user_id);
  if (ids.length) await User.updateMany({ _id: { $in: ids } }, { $inc: { token_version: 1 } });
  huyCache();
}

async function remove(actorId, roleId, transferRoleId, ip) {
  const role = await mustFind(roleId);
  const actor = await rbac.accessOf(actorId);
  policy.assertCanTouchProtected(actor.permissions, role.is_protected);
  if (role.is_system) throw new ServiceError("Không xóa vai trò của hệ thống");

  const holders = await UserRole.find({ role_id: role._id }).select("user_id").lean();
  if (!transferRoleId) policy.assertDeletableRole(role, holders.length);

  if (holders.length) {
    const next = await Role.findById(transferRoleId).lean();
    if (!next) throw new ServiceError("Chọn vai trò để chuyển người dùng");
    if (String(next._id) === String(role._id)) {
      throw new ServiceError("Chọn một vai trò khác vai trò đang xóa");
    }
    policy.assertCanTouchProtected(actor.permissions, next.is_protected);
    policy.assertCanGrant(actor.permissions, await rbac.permissionsOfRole(next._id));
    const ids = holders.map((row) => row.user_id);
    await UserRole.updateMany({ role_id: role._id }, { role_id: next._id });
    await User.updateMany(
      { _id: { $in: ids } },
      { $set: { role: vaiTroLuuUser(next.code) }, $inc: { token_version: 1 } },
    );
  }

  await RolePermission.deleteMany({ role_id: role._id });
  await role.deleteOne();
  huyCache();
}

module.exports = { choices, list, matrix, create, update, savePermissions, remove };
