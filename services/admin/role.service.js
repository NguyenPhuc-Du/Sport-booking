const Role = require("../../models/role.model");
const Permission = require("../../models/permission.model");
const RolePermission = require("../../models/role-permission.model");
const UserRole = require("../../models/user-role.model");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const { PERMISSION_GROUPS } = require("./catalog");
const policy = require("./rbac-policy");
const rbac = require("./rbac.service");
const audit = require("./audit.service");

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

function groupKey(code) {
  const resource = code.split(":")[0];
  return resource === "system" ? "role" : resource;
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
  const roles = await Role.find().sort({ is_system: -1, name: 1 }).lean();
  const counts = await UserRole.aggregate([{ $group: { _id: "$role_id", total: { $sum: 1 } } }]);
  const totalOf = new Map(counts.map((row) => [String(row._id), row.total]));
  return roles.map((role) => ({
    ...role,
    userCount: totalOf.get(String(role._id)) || 0,
    kind: role.is_system ? "Hệ thống" : "Tùy chỉnh",
  }));
}

async function matrix(roleId) {
  const role = await Role.findById(roleId).lean();
  if (!role) throw new ServiceError("Không có vai trò này");
  const permissions = await Permission.find().sort({ code: 1 }).lean();
  const owned = new Set(await rbac.permissionsOfRole(role._id));
  const buckets = new Map();

  permissions.forEach((item) => {
    const key = groupKey(item.code);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({
      code: item.code,
      description: item.description,
      checked: owned.has(item.code),
    });
  });

  const userCount = await UserRole.countDocuments({ role_id: role._id });
  return {
    role,
    userCount,
    groups: [...buckets.entries()].map(([key, items]) => ({
      key,
      label: PERMISSION_GROUPS[key] || key,
      items,
    })),
  };
}

async function create(actorId, body, ip) {
  const input = readRole(body, true);
  const existed = await Role.findOne({ code: input.code }).lean();
  if (existed) throw new ServiceError("Mã vai trò đã có");
  const role = await Role.create({ ...input, is_system: false, is_protected: false });
  await audit.write(actorId, "role.create", role._id, input.name, {
    ip,
    targetType: "role",
    after: { code: input.code, name: input.name },
  });
  return role;
}

async function update(actorId, roleId, body, ip) {
  const role = await mustFind(roleId);
  const actor = await rbac.accessOf(actorId);
  policy.assertCanTouchProtected(actor.permissions, role.is_protected);
  const input = readRole(body, false);
  const before = { name: role.name, description: role.description };
  role.name = input.name;
  role.description = input.description;
  await role.save();
  await audit.write(actorId, "role.update", role._id, input.name, {
    ip,
    targetType: "role",
    before,
    after: input,
  });
}

async function savePermissions(actorId, roleId, rawCodes, ip) {
  const role = await mustFind(roleId);
  const actor = await rbac.accessOf(actorId);
  policy.assertCanTouchProtected(actor.permissions, role.is_protected);

  const wanted = asList(rawCodes);
  policy.assertCanGrant(actor.permissions, wanted);
  const known = await Permission.find({ code: { $in: wanted } }).lean();
  if (known.length !== wanted.length) throw new ServiceError("Có mã quyền không tồn tại");

  const before = await rbac.permissionsOfRole(role._id);
  await RolePermission.deleteMany({ role_id: role._id });
  if (known.length) {
    await RolePermission.insertMany(
      known.map((item) => ({ role_id: role._id, permission_id: item._id })),
    );
  }
  await audit.write(actorId, "role.permissions", role._id, role.name, {
    ip,
    targetType: "role",
    before: { permissions: before },
    after: { permissions: wanted },
  });

  const holders = await UserRole.find({ role_id: role._id }).select("user_id").lean();
  const ids = holders.map((row) => row.user_id);
  if (ids.length) await User.updateMany({ _id: { $in: ids } }, { $inc: { token_version: 1 } });
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
      { $set: { role: next.code }, $inc: { token_version: 1 } },
    );
  }

  await RolePermission.deleteMany({ role_id: role._id });
  await role.deleteOne();
  await audit.write(actorId, "role.delete", roleId, role.name, {
    ip,
    targetType: "role",
    before: { code: role.code, name: role.name, userCount: holders.length },
  });
}

module.exports = { choices, list, matrix, create, update, savePermissions, remove };
