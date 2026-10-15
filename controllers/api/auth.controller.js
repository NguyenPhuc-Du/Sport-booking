const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const tokenService = require("../../services/token.service");
const { toUser } = require("./user.mapper");

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^0\d{9}$/;

function fail(res, status, message) {
  return res.status(status).json({ message });
}

async function issueSession(res, user, statusCode) {
  const token = tokenService.sign(user._id);
  return res.status(statusCode).json({
    token,
    user: toUser(user),
  });
}

module.exports.register = async (req, res) => {
  try {
    const fullName = (req.body.fullName || "").trim();
    const phone = (req.body.phone || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!fullName) return fail(res, 400, "Họ tên không được để trống");
    if (!PHONE_PATTERN.test(phone)) return fail(res, 400, "Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
    if (!EMAIL_PATTERN.test(email)) return fail(res, 400, "Email không đúng định dạng");
    if (password.length < 6) return fail(res, 400, "Mật khẩu cần ít nhất 6 ký tự");

    const existed = await User.findOne({ $or: [{ email }, { phone }] });
    if (existed) {
      if (existed.email === email) return fail(res, 409, "Email này đã được đăng ký");
      return fail(res, 409, "Số điện thoại này đã được đăng ký");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      phone,
      email,
      password_hash: passwordHash,
    });
    return issueSession(res, user, 201);
  } catch (error) {
    return fail(res, 500, "Đăng ký thất bại");
  }
};

module.exports.login = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    if (!email || !password) return fail(res, 400, "Email và mật khẩu không được để trống");

    const user = await User.findOne({ email });
    if (!user) return fail(res, 401, "Email đăng nhập không chính xác");
    if (user.status === "inactive") return fail(res, 403, "Tài khoản đã bị khóa");

    const matched = await bcrypt.compare(password, user.password_hash || "");
    if (!matched) return fail(res, 401, "Mật khẩu không chính xác");

    return issueSession(res, user, 200);
  } catch (error) {
    return fail(res, 500, "Đăng nhập thất bại");
  }
};

module.exports.me = async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user || user.status === "inactive") {
    return fail(res, 401, "Phiên đăng nhập không hợp lệ");
  }
  return res.json({ user: toUser(user) });
};
