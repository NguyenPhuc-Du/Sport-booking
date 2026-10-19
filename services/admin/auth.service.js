const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");

class ServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = "ServiceError";
  }
}

async function roleCodesOf(userId) {
  const links = await UserRole.find({
    user_id: userId,
  })
    .populate("role_id", "code")
    .lean();
  return links.filter((row) => row.role_id).map((row) => row.role_id.code);
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new ServiceError("Email hoặc mật khẩu không đúng");

  const matched = await bcrypt.compare(password, user.password_hash || "");
  if (!matched) throw new ServiceError("Email hoặc mật khẩu không đúng");

  if (user.status !== "active") throw new ServiceError("Tài khoản đã bị khóa");

  const codes = await roleCodesOf(user._id);
  if (!codes.includes("ADMIN")) {
    throw new ServiceError("Tài khoản không thuộc quản trị hệ thống");
  }

  const accessToken = jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  return { accessToken };
}
module.exports = { login, ServiceError, roleCodesOf };
