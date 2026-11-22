const Role = require("../../models/role.model");
const Permission = require("../../models/permission.model");
const RolePermission = require("../../models/role-permission.model");
const UserRole = require("../../models/user-role.model");

async function accessOf(userId) {
  const link = await UserRole.findOne({ user_id: userId }).lean();
  if (!link) {
    return { role: null, permissions: [] };
  }
  const role = await Role.findById(link.role_id).lean();
  if (!role) {
    return { role: null, permissions: [] };
  }
  const joins = await RolePermission.find({ role_id: role._id }).lean();
  const ids = joins.map((row) => row.permission_id);
  const rows = await Permission.find({ _id: { $in: ids } })
    .select("code")
    .lean();
  return {
    role,
    permissions: rows.map((row) => row.code),
  };
}

function can(permissions, code) {
  return (permissions || []).includes(code);
}

async function permissionCodesByRole() {
  const [joins, permissions] = await Promise.all([
    RolePermission.find().select("role_id permission_id").lean(),
    Permission.find().select("code").lean(),
  ]);
  const codeOf = new Map(permissions.map((item) => [String(item._id), item.code]));
  const grouped = new Map();
  joins.forEach((join) => {
    const code = codeOf.get(String(join.permission_id));
    if (!code) return;
    const key = String(join.role_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(code);
  });
  return grouped;
}

async function permissionsOfRole(roleId) {
  const joins = await RolePermission.find({ role_id: roleId }).lean();
  const ids = joins.map((row) => row.permission_id);
  const rows = await Permission.find({ _id: { $in: ids } })
    .select("code")
    .lean();
  return rows.map((row) => row.code);
}

async function countProtectedUsers(exceptUserId) {
  const roles = await Role.find({ is_protected: true }).select("_id").lean();
  const roleIds = roles.map((row) => row._id);
  const filter = { role_id: { $in: roleIds } };
  if (exceptUserId) filter.user_id = { $ne: exceptUserId };
  return UserRole.countDocuments(filter);
}

module.exports = {
  accessOf,
  can,
  permissionCodesByRole,
  permissionsOfRole,
  countProtectedUsers,
};
