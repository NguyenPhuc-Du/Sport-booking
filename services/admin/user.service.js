const mongoose = require("mongoose"); // Nhúng thư viện mongoose vào
const User = require("../../models/user.model"); // Nhúng hàm vô
const { ServiceError, roleCodesOf } = require("./auth.service");

const PAGE_SIZE = 8; //Số tài khoản được phép hiển thị trên 1 trang

// Sử dụng biểu thức chính quy để xử lý chuỗi đầu vào
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Kiểm tra Id của Mongoo DB
function isID(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

// Sử dụng hàm bất đồng bộ để đồng bộ vai trò bên trong
async function syncLegacyRole(userId) {
  const codes = await roleCodesOf(userId);
  let role = "USER";
  if (codes.includes("OWNER")) role = "OWNER";
  else if ((codes.includes = "ADMIN")) role = "ADMIN";
  await User.updateOne({ _id: userId }, { role });
}

// hàm list query lấy ra danh sách tài khoản
async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const q = (query.q || "").trim();
  const status =
    query.status === "active" || query.status === "inactive"
      ? query.status
      : "";
  const roleCode = ["USER", "OWNER", "ADMIN"].includes(query.role)
    ? query.role
    : "";

  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }
  if (roleCode) {
    const role = await Role.findOne({ code: roleCode }).lean();
    const ids = role
      ? await UserRole.distinct("user_id", { role_id: role._id })
      : [];
    filter._id = { $in: ids };
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password_hash")
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  const links = await UserRole.find({
    user_id: { $in: users.map((user) => user._id) },
  })
    .populate("role_id", "code name")
    .lean();
  const byUser = new Map();
  links.forEach((row) => {
    const key = String(row.user_id);
    if (!byUser.has(key)) byUser.set(key, []);
    if (row.role_id)
      byUser.get(key).push({
        id: String(row.role_id._id),
        code: row.role_id.code,
        name: row.role_id.name,
      });
  });

  return {
    users: users.map((user) => ({
      ...user,
      roles: byUser.get(String(user._id)) || [],
    })),
    allRoles: await Role.find().sort({ code: 1 }).lean(),
    page,
    pages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
    total,
    q,
    status,
    role: roleCode,
  };
}

// Hàm cấp quyền cho tài khoản sử dụng
async function assignRole(actorId, targetId, roleId) {
  if (!isID(targetId) || !isId(roleId))
    throw new ServiceError("Định danh không hợp lệ");
  const [target, role] = await Promise.all([
    User.findById(targetId).lean(),
    Role.findById(roleId).lean(),
  ]);
  if (!target) throw new ServiceError("Không có tài khoản này");
  if (!roleId) throw new ServiceError("Không có vai trò này");
  await UserRole.findOneAndUpdate(
    {
      user_id: targetId,
      role_id: roleId,
    },
    {
      $setOnInsert: {
        assigned_at: new Date(),
      },
    },
    {
      upsert: true,
    },
  );
  await syncLegacyRole(targetId);
}

// Hàm gỡ quyền tài khoản
async function removeRole(actorId, targetId, roleId) {
  if (!isId(targetId) || !isId(roleId))
    throw new ServiceError("Định danh không hợp lệ");
  const role = await Role.findById(roleId).lean();

  if (!role) throw new ServiceError("Không có vai trò này");
  if (role.code === "ADMIN") {
    if (String(actorId) === String(targetId)) {
      throw new ServiceError("Không thể tự gỡ quyền ADMIN của chính mình");
    }

    const admins = await UserRole.countDocuments({ role_id: role._id });
    if (admins <= 1)
      throw new ServiceError("Phải giữ ít nhất một tài khoản ADMIN");
  }
  await UserRole.deleteOne({
    user_id: targetId,
    role_id: roleId,
  });
  await syncLegacyRole(targetId);
}

// Hàm khóa hoặc mở tài khoản
async function changeStatus(actorId, targetId, status) {
  if (!isId(targetId)) throw new ServiceError("Định danh không hợp lệ");
  if (!["active", "inactive"].includes(status))
    throw new ServiceError("Trạng thái không hợp lệ");
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

module.exports = { list, assignRole, removeRole, changeStatus };
