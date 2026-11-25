const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const UserRole = require("../../models/user-role.model");
const Role = require("../../models/role.model");
const { ServiceError } = require("./auth.service");
const ledger = require("./ledger.service");
const { STATUS_CODES } = require("./catalog");
const policy = require("./rbac-policy");
const rbac = require("./rbac.service");
const { huyCache, nho } = require("./bo-nho");

const { phanTrang, ganLink } = require("../../helpers/phanTrang");
const ADMIN_ROLE_CODES = ["SUPER_ADMIN", "ADMIN", "ACCOUNT_ADMIN", "COMMISSION_ADMIN"];
const USER_ROLE_ENUM = ["OWNER", "ADMIN", "USER", "SUPER_ADMIN"];

/**
 * Đổi mã vai trò console sang giá trị cột users.role.
 * Schema user dùng chung chỉ có OWNER, ADMIN, USER, SUPER_ADMIN.
 * Vai trò thật (Quản trị tài khoản, hoa hồng) vẫn lưu ở user_roles.
 * @param {string} code Mã trong collection roles.
 * @returns {string}
 */
function vaiTroLuuUser(code) {
  return USER_ROLE_ENUM.includes(code) ? code : "ADMIN";
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/[\s.-]/g, "");
  if (phone.startsWith("+84")) phone = "0" + phone.slice(3);
  if (phone.startsWith("84") && phone.length === 11) phone = "0" + phone.slice(2);
  return phone;
}

function readProfile(body) {
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = normalizePhone(body.phone);
  if (!fullName) throw new ServiceError("Nhập họ và tên");
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    throw new ServiceError("Email không đúng định dạng");
  }
  if (!/^0(3|5|7|8|9)\d{8}$/.test(phone)) {
    throw new ServiceError(
      "Số điện thoại Việt Nam gồm 10 số, đầu 03, 05, 07, 08 hoặc 09",
    );
  }
  return { fullName, email, phone };
}

function endOldSessions(user) {
  user.token_version = (Number(user.token_version) || 0) + 1;
}

async function mustFindUser(id) {
  if (!isId(id)) throw new ServiceError("Định danh không hợp lệ");
  const user = await User.findById(id);
  if (!user) throw new ServiceError("Không có tài khoản này");
  return user;
}

async function roleOf(userId) {
  const link = await UserRole.findOne({ user_id: userId }).lean();
  if (!link) return null;
  return Role.findById(link.role_id).lean();
}

async function actorMayTouch(actorId, role) {
  const actor = await rbac.accessOf(actorId);
  policy.assertCanTouchProtected(actor.permissions, role && role.is_protected);
  return actor;
}

async function ensureUnique(profile, exceptId) {
  const filter = { $or: [{ email: profile.email }, { phone: profile.phone }] };
  if (exceptId) filter._id = { $ne: exceptId };
  const existed = await User.findOne(filter).lean();
  if (existed) throw new ServiceError("Email hoặc số điện thoại đã có");
}

function rethrowDuplicate(error) {
  if (error && error.code === 11000) {
    throw new ServiceError("Email hoặc số điện thoại đã có");
  }
  throw error;
}

/**
 * Danh sách tài khoản có phân trang. roleCode ép từ route, không tin query khi đã ép.
 * @param {object} query Query đã được controller làm sạch.
 * @param {string|string[]|null} forcedRole Vai trò cố định của trang.
 * @returns {Promise<object>} users và pagination.
 */
async function list(query, forcedRole) {
  const q = String(query.q || "").trim();
  const status = STATUS_CODES.includes(query.status) ? query.status : "";
  const roleCode = forcedRole || (/^[A-Z0-9_]+$/.test(query.role || "") ? query.role : "");
  const filter = {};
  if (query.ids) filter._id = { $in: query.ids };
  if (status) filter.status = status;
  if (roleCode && !Array.isArray(roleCode)) filter.role = roleCode;
  filter.deleted_at = null;
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }
  const sortField = ["fullName", "email", "createdAt"].includes(query.sort) ? query.sort : "createdAt";
  const dir = query.dir === "asc" ? 1 : -1;
  const idKey = Array.isArray(query.ids) ? query.ids.map(String).sort().join(".") : "";
  const data = await nho(
    `users:${query.path || ""}:${roleCode}:${status}:${q}:${query.page}:${query.pageSize}:${sortField}:${dir}:${idKey}`,
    20000,
    () =>
      phanTrang({
        model: User,
        filter,
        sort: { [sortField]: dir },
        page: query.page,
        pageSize: query.pageSize,
        select: "fullName email phone role status createdAt",
      }),
  );
  const path = query.path || "/admin/users";
  return {
    users: data.items,
    page: data.page,
    pages: data.totalPages,
    total: data.total,
    q,
    status,
    role: Array.isArray(roleCode) ? "" : roleCode,
    pagination: ganLink(data, path, {
      q,
      status,
      role: Array.isArray(roleCode) ? "" : roleCode,
      sort: query.sort || "",
      dir: query.dir || "",
    }),
  };
}

/**
 * Danh sách người có vai trò quản trị. Không nhận id từ query.
 * @param {object} query Bộ lọc tìm kiếm và trang.
 * @returns {Promise<object>}
 */
async function listAdmins(query) {
  const roles = await Role.find({ code: { $in: ADMIN_ROLE_CODES } }).select("_id").lean();
  const links = await UserRole.find({ role_id: { $in: roles.map((item) => item._id) } })
    .select("user_id")
    .lean();
  const data = await list({ ...query, ids: links.map((item) => item.user_id), path: "/admin/admins" });
  const named = await UserRole.find({ user_id: { $in: data.users.map((item) => item._id) } })
    .populate("role_id", "name code")
    .lean();
  const byUser = new Map(named.map((item) => [String(item.user_id), item.role_id]));
  data.users = data.users.map((item) => {
    const role = byUser.get(String(item._id));
    return { ...item, roleName: role ? role.name : item.role, roleCode: role ? role.code : item.role };
  });
  return data;
}

async function create(actorId, body, meta) {
  const profile = readProfile(body);
  const password = String(body.password || "");
  if (password.length < 6) throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");

  const role = await Role.findOne({ code: body.role }).lean();
  if (!role) throw new ServiceError("Chọn một vai trò hợp lệ");
  const actor = await actorMayTouch(actorId, role);
  policy.assertCanGrant(actor.permissions, await rbac.permissionsOfRole(role._id));
  await ensureUnique(profile);

  try {
    const user = await User.create({
      ...profile,
      password_hash: await bcrypt.hash(password, 10),
      role: vaiTroLuuUser(role.code),
      status: "active",
    });
    await UserRole.create({ user_id: user._id, role_id: role._id });
    huyCache();
  } catch (error) {
    rethrowDuplicate(error);
  }
}

async function updateProfile(actorId, targetId, body, meta) {
  const profile = readProfile(body);
  const target = await mustFindUser(targetId);
  await ensureUnique(profile, targetId);
  target.fullName = profile.fullName;
  target.email = profile.email;
  target.phone = profile.phone;
  try {
    await target.save();
    huyCache();
  } catch (error) {
    rethrowDuplicate(error);
  }
}

async function resetPassword(actorId, targetId, password, meta) {
  if (String(password || "").length < 8) throw new ServiceError("Mật khẩu mới tối thiểu 8 ký tự");
  const target = await mustFindUser(targetId);
  target.password_hash = await bcrypt.hash(password, 10);
  endOldSessions(target);
  await target.save();
  huyCache();
}

async function changeRole(actorId, targetId, roleCode, meta) {
  policy.assertSelf(actorId, targetId, "Không thể tự đổi vai trò của chính mình");
  const target = await mustFindUser(targetId);
  const next = await Role.findOne({ code: roleCode }).lean();
  if (!next) throw new ServiceError("Không có vai trò này");

  const current = await roleOf(targetId);
  const actor = await actorMayTouch(actorId, current);
  policy.assertCanTouchProtected(actor.permissions, next.is_protected);
  policy.assertCanGrant(actor.permissions, await rbac.permissionsOfRole(next._id));
  policy.assertKeepLastProtected({
    wasProtected: current && current.is_protected,
    willBeProtected: next.is_protected,
    protectedCount: await rbac.countProtectedUsers(),
  });

  await UserRole.findOneAndUpdate(
    { user_id: target._id },
    { user_id: target._id, role_id: next._id },
    { upsert: true },
  );
  target.role = vaiTroLuuUser(next.code);
  endOldSessions(target);
  await target.save();
  huyCache();
}

async function changeStatus(actorId, targetId, status, meta) {
  if (!STATUS_CODES.includes(status)) throw new ServiceError("Trạng thái không hợp lệ");
  if (policy.sameId(actorId, targetId) && status === "inactive") {
    throw new ServiceError("Không thể tự khóa tài khoản đang đăng nhập");
  }

  const target = await mustFindUser(targetId);
  const current = await roleOf(targetId);
  await actorMayTouch(actorId, current);
  if (status === "inactive") {
    policy.assertKeepLastProtected({
      wasProtected: current && current.is_protected,
      willBeProtected: false,
      protectedCount: await rbac.countProtectedUsers(),
    });
  }

  target.status = status;
  endOldSessions(target);
  await target.save();
  huyCache();
}

async function rolesActorMayAssign(actorId) {
  const actor = await rbac.accessOf(actorId);
  const [roles, codesOf] = await Promise.all([
    Role.find().sort({ name: 1 }).lean(),
    rbac.permissionCodesByRole(),
  ]);
  return roles
    .filter((role) => {
      const codes = codesOf.get(String(role._id)) || [];
      const tooHigh =
        !actor.permissions.includes("system:override") &&
        !policy.includesAll(actor.permissions, codes);
      const hiddenProtected =
        role.is_protected && !actor.permissions.includes("system:override");
      return !tooHigh && !hiddenProtected;
    })
    .map((role) => ({ code: role.code, label: role.name }));
}

async function detail(id) {
  if (!isId(id)) throw new ServiceError("Định danh không hợp lệ");
  const user = await User.findById(id).select("-password_hash").lean();
  if (!user) throw new ServiceError("Không có tài khoản này");
  const position = user.role === "OWNER" ? await ledger.ownerPosition(user._id) : null;
  return { user, position };
}

/**
 * Hồ sơ của chính người đang đăng nhập.
 * @param {string} userId Id user.
 * @returns {Promise<object|null>}
 */
async function profileOf(userId) {
  return User.findById(userId).select("-password_hash").lean();
}

/**
 * Sửa tên, email, số điện thoại của chính mình.
 * @param {string} userId Id user.
 * @param {object} body Dữ liệu form.
 * @returns {Promise<object>}
 */
/**
 * Đặt mật khẩu mới cho chính người đang đăng nhập.
 * Không tăng token_version, để phiên hiện tại không bị đá ra.
 * @param {string} userId Id user.
 * @param {object} body currentPassword và newPassword.
 * @returns {Promise<void>}
 */
async function changeOwnPassword(userId, body) {
  const current = String(body.currentPassword || "");
  const next = String(body.newPassword || "");
  if (next.length < 8) throw new ServiceError("Mật khẩu mới tối thiểu 8 ký tự");
  const user = await mustFindUser(userId);
  const matched = await bcrypt.compare(current, user.password_hash || "");
  if (!matched) throw new ServiceError("Mật khẩu hiện tại không đúng");
  user.password_hash = await bcrypt.hash(next, 10);
  await user.save();
  huyCache();
}

/**
 * Xóa một quản trị viên. Không xóa chính mình và không xóa Super Admin cuối cùng.
 * @param {string} actorId Người đang đăng nhập.
 * @param {string} targetId Tài khoản bị xóa.
 * @returns {Promise<void>}
 */
async function removeAdmin(actorId, targetId) {
  policy.assertSelf(actorId, targetId, "Không thể xóa chính mình");
  const target = await mustFindUser(targetId);
  const current = await roleOf(targetId);
  if (!current || !ADMIN_ROLE_CODES.includes(current.code)) {
    throw new ServiceError("Chỉ xóa được tài khoản quản trị");
  }
  await actorMayTouch(actorId, current);
  if (current.is_protected) {
    policy.assertKeepLastProtected({
      wasProtected: true,
      willBeProtected: false,
      protectedCount: await rbac.countProtectedUsers(),
    });
  }
  await UserRole.deleteOne({ user_id: target._id });
  await User.deleteOne({ _id: target._id });
  huyCache();
}

async function updateSelf(userId, body) {
  const profile = readProfile(body);
  await ensureUnique(profile, userId);
  const user = await mustFindUser(userId);
  user.fullName = profile.fullName;
  user.email = profile.email;
  user.phone = profile.phone;
  await user.save();
  huyCache();
  return user;
}

module.exports = {
  vaiTroLuuUser,
  list,
  listAdmins,
  profileOf,
  updateSelf,
  changeOwnPassword,
  removeAdmin,
  create,
  updateProfile,
  resetPassword,
  changeRole,
  changeStatus,
  rolesActorMayAssign,
  detail,
};
