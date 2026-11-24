const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const ServiceError = require("./service-error");
const { accessOf } = require("./rbac.service");
const { ADMIN_PERMISSION_CODES } = require("./catalog");

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new ServiceError("Email hoặc mật khẩu không đúng");

  const matched = await bcrypt.compare(password, user.password_hash || "");
  if (!matched) throw new ServiceError("Email hoặc mật khẩu không đúng");

  if (user.status !== "active") throw new ServiceError("Tài khoản đã bị khóa");
  const access = await accessOf(user._id);
  const allowed = access.permissions.some((code) =>
    ADMIN_PERMISSION_CODES.includes(code),
  );
  if (!allowed) {
    throw new ServiceError("Tài khoản không thuộc quản trị hệ thống");
  }

  const accessToken = jwt.sign(
    { id: user._id.toString(), tv: Number(user.token_version) || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return { accessToken, userId: user._id };
}

module.exports = { login, ServiceError };
