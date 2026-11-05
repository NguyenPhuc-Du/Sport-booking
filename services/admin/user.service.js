const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const ledger = require("./ledger.service");
const { ROLE_CODES, STATUS_CODES } = require("./catalog");

const PAGE_SIZE = 8;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isID(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function cleanPhone(value) {
  return String(value || "").replace(/\s+/g, "");
}

function readProfile(body) {
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const phone = cleanPhone(body.phone);
  if (!fullName) throw new ServiceError("Nhập họ và tên");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ServiceError("Email không đúng định dạng");
  }
  if (phone.length < 8) throw new ServiceError("Số điện thoại chưa hợp lệ");
  return { fullName, email, phone };
}

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const q = (query.q || "").trim();
  const status = STATUS_CODES.includes(query.status) ? query.status : "";
  const roleCode = ROLE_CODES.includes(query.role) ? query.role : "";

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

  return {
    users,
    page,
    pages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
    total,
    q,
    status,
    role: roleCode,
  };
}

async function create(actorId, body) {
  const profile = readProfile(body);
  const role = ROLE_CODES.includes(body.role) ? body.role : "";
  const password = String(body.password || "");
  if (!role) throw new ServiceError("Chọn một vai trò hợp lệ");
  if (password.length < 6) throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");

  const existed = await User.findOne({
    $or: [{ email: profile.email }, { phone: profile.phone }],
  }).lean();
  if (existed) throw new ServiceError("Email hoặc số điện thoại đã có");

  const password_hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      password_hash,
      role,
      status: "active",
    });
    await audit.write(
      actorId,
      "user.create",
      user._id,
      `${profile.fullName} · ${role}`,
    );
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Email hoặc số điện thoại đã có");
    }
    throw error;
  }
}

async function updateProfile(actorId, targetId, body) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  const profile = readProfile(body);
  const target = await User.findById(targetId);
  if (!target) throw new ServiceError("Không có tài khoản này");

  const duplicated = await User.findOne({
    _id: { $ne: targetId },
    $or: [{ email: profile.email }, { phone: profile.phone }],
  }).lean();
  if (duplicated) throw new ServiceError("Email hoặc số điện thoại đã có");

  target.fullName = profile.fullName;
  target.email = profile.email;
  target.phone = profile.phone;
  try {
    await target.save();
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ServiceError("Email hoặc số điện thoại đã có");
    }
    throw error;
  }
  await audit.write(actorId, "user.update", target._id, profile.fullName);
}

async function resetPassword(actorId, targetId, password) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (String(password || "").length < 6) {
    throw new ServiceError("Mật khẩu tối thiểu 6 ký tự");
  }
  const target = await User.findById(targetId);
  if (!target) throw new ServiceError("Không có tài khoản này");
  target.password_hash = await bcrypt.hash(password, 10);
  await target.save();
  await audit.write(actorId, "user.password", target._id, target.fullName);
}

async function changeRole(actorId, targetId, role) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!ROLE_CODES.includes(role))
    throw new ServiceError("Không có vai trò này");

  const target = await User.findById(targetId).lean();
  if (!target) throw new ServiceError("Không có tài khoản này");

  if (target.role === "ADMIN" && role !== "ADMIN") {
    if (String(actorId) === String(targetId)) {
      throw new ServiceError("Không thể tự gỡ quyền ADMIN của chính mình");
    }
    const admins = await User.countDocuments({ role: "ADMIN" });
    if (admins <= 1) {
      throw new ServiceError("Phải giữ ít nhất một tài khoản ADMIN");
    }
  }

  await User.updateOne({ _id: targetId }, { role });
  await audit.write(actorId, "user.role", targetId, `${target.role} → ${role}`);
}

async function changeStatus(actorId, targetId, status) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!STATUS_CODES.includes(status)) {
    throw new ServiceError("Trạng thái không hợp lệ");
  }
  if (String(actorId) === String(targetId) && status === "inactive") {
    throw new ServiceError("Không thể tự khóa tài khoản đang đăng nhập");
  }
  const updated = await User.findByIdAndUpdate(
    targetId,
    { status },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ServiceError("Không có tài khoản này");
  await audit.write(
    actorId,
    "user.status",
    targetId,
    status === "inactive" ? "Khóa" : "Mở khóa",
  );
}

async function detail(id) {
  if (!isID(id)) throw new ServiceError("Định danh không hợp lệ");
  const user = await User.findById(id).select("-password_hash").lean();
  if (!user) throw new ServiceError("Không có tài khoản này");
  const position =
    user.role === "OWNER" ? await ledger.ownerPosition(user._id) : null;
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
  detail,
  escapeRegex,
};
