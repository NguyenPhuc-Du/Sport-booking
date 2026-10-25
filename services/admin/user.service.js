const mongoose = require("mongoose");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");

const PAGE_SIZE = 8;
const ROLES = ["USER", "OWNER", "ADMIN"];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isID(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const q = (query.q || "").trim();
  const status =
    query.status === "active" || query.status === "inactive"
      ? query.status
      : "";
  const roleCode = ROLES.includes(query.role) ? query.role : "";

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

async function changeRole(actorId, targetId, role) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!ROLES.includes(role)) throw new ServiceError("Không có vai trò này");

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
}

async function changeStatus(actorId, targetId, status) {
  if (!isID(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!["active", "inactive"].includes(status)) {
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
}

module.exports = { list, changeRole, changeStatus };
