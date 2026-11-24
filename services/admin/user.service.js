const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const UserRole = require("../../models/user-role.model");
const Role = require("../../models/role.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const ledger = require("./ledger.service");
const { STATUS_CODES } = require("./catalog");
const policy = require("./rbac-policy");
const rbac = require("./rbac.service");

const PAGE_SIZE = 8;

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

function accountView(user) {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  };
}

function endOldSessions(user) {
  user.token_version = (Number(user.token_version) || 0) + 1;
}

async function note(actorId, action, targetId, detail, meta, before, after) {
  await audit.write(actorId, action, targetId, detail, {
    ip: meta && meta.ip,
    targetType: "user",
    before,
    after,
  });
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

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const q = String(query.q || "").trim();
  const status = STATUS_CODES.includes(query.status) ? query.status : "";
  const roleCode = /^[A-Z0-9_]+$/.test(query.role || "") ? query.role : "";
  const filter = {};
  if (status) filter.status = status;
  if (roleCode) filter.role = roleCode;
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password_hash")
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  return { users, page, pages: Math.max(Math.ceil(total / PAGE_SIZE), 1), total, q, status, role: roleCode };
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
      role: role.code,
      status: "active",
    });
    await UserRole.create({ user_id: user._id, role_id: role._id });
    await note(actorId, "user.create", user._id, `${profile.fullName} · ${role.code}`, meta, null, {
      ...profile,
      role: role.code,
    });
  } catch (error) {
    rethrowDuplicate(error);
  }
}

async function updateProfile(actorId, targetId, body, meta) {
  const profile = readProfile(body);
  const target = await mustFindUser(targetId);
  await ensureUnique(profile, targetId);
  const before = accountView(target);
  target.fullName = profile.fullName;
  target.email = profile.email;
  target.phone = profile.phone;
  try {
    await target.save();
  } catch (error) {
    rethrowDuplicate(error);
  }
  await note(actorId, "user.update", target._id, profile.fullName, meta, before, accountView(target));
}

async function resetPassword(actorId, targetId, password, meta) {
  if (String(password || "").length < 6) throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");
  const target = await mustFindUser(targetId);
  target.password_hash = await bcrypt.hash(password, 10);
  endOldSessions(target);
  await target.save();
  await note(actorId, "user.password", target._id, target.fullName, meta);
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

  const beforeRole = current ? current.code : target.role;
  await UserRole.findOneAndUpdate(
    { user_id: target._id },
    { user_id: target._id, role_id: next._id },
    { upsert: true },
  );
  target.role = next.code;
  endOldSessions(target);
  await target.save();

  const reason = meta && meta.reason ? String(meta.reason).slice(0, 300) : "";
  const detail = reason ? `${beforeRole} → ${next.code} · ${reason}` : `${beforeRole} → ${next.code}`;
  await note(actorId, "user.role", target._id, detail, meta, { role: beforeRole }, { role: next.code });
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

  const before = target.status;
  target.status = status;
  endOldSessions(target);
  await target.save();
  await note(
    actorId,
    "user.status",
    target._id,
    status === "inactive" ? "Khóa" : "Mở khóa",
    meta,
    { status: before },
    { status },
  );
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
      const tooHigh = !policy.includesAll(actor.permissions, codes);
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
  const audits = await audit.list({ target_id: user._id });
  return { user, position, audits };
}

module.exports = {
  list,
  create,
  updateProfile,
  resetPassword,
  changeRole,
  changeStatus,
  rolesActorMayAssign,
  detail,
};
