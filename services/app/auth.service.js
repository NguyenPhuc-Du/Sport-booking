const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../../models/user.model");
const Otp = require("../../models/otp.model");
const mailService = require("./mail.service");

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^0\d{9}$/;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const PURPOSES = ["register", "reset_password"];
const STAFF_ROLES = ["OWNER", "ADMIN"];
const CUSTOMER = { role: { $nin: STAFF_ROLES } };

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function genOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function createAndSendOtp({ email, purpose, payload }) {
  const last = await Otp.findOne({ email, purpose });
  if (last && last.expiresAt.getTime() - OTP_TTL_MS > Date.now() - OTP_RESEND_MS) {
    throw httpError(429, "Vui lòng đợi 60 giây trước khi gửi lại mã");
  }

  await Otp.deleteMany({ email, purpose });

  const code = genOtp();
  const codeHash = await bcrypt.hash(code, 10);
  await Otp.create({
    email,
    codeHash,
    purpose,
    payload,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await mailService.sendOtpMail(email, code, purpose);
}

async function checkOtp(email, purpose, code) {
  const otp = await Otp.findOne({ email, purpose });
  if (!otp || otp.expiresAt < new Date()) {
    throw httpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn");
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw httpError(400, "Nhập sai quá nhiều lần, hãy gửi lại mã");
  }
  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    otp.attempts += 1;
    await otp.save();
    throw httpError(400, "Mã OTP không chính xác");
  }
  return otp;
}

async function register(body) {
  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const password = (body.password || "").trim();

  if (!fullName) throw httpError(400, "Họ tên không được để trống");
  if (!PHONE_PATTERN.test(phone)) {
    throw httpError(400, "Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
  }
  if (!EMAIL_PATTERN.test(email)) throw httpError(400, "Email không đúng định dạng");
  if (password.length < 6) throw httpError(400, "Mật khẩu cần ít nhất 6 ký tự");

  const existed = await User.findOne({ $or: [{ email }, { phone }] });
  if (existed) {
    if (existed.email === email) throw httpError(409, "Email này đã được đăng ký");
    throw httpError(409, "Số điện thoại này đã được đăng ký");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await createAndSendOtp({
    email,
    purpose: "register",
    payload: { fullName, phone, passwordHash },
  });
  return "Đã gửi mã xác minh tới email";
}

async function registerVerify(body) {
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  if (!email || !code) throw httpError(400, "Thiếu email hoặc mã OTP");

  const otp = await checkOtp(email, "register", code);
  const { fullName, phone, passwordHash } = otp.payload || {};
  if (!fullName || !phone || !passwordHash) {
    throw httpError(400, "Phiên đăng ký không hợp lệ, hãy đăng ký lại");
  }

  const user = await User.create({
    fullName,
    phone,
    email,
    password_hash: passwordHash,
    role: "USER",
  });
  await Otp.deleteMany({ email, purpose: "register" });
  return user;
}

async function resendOtp(body) {
  const email = (body.email || "").trim().toLowerCase();
  const purpose = body.purpose;
  if (!email || !PURPOSES.includes(purpose)) throw httpError(400, "Yêu cầu không hợp lệ");

  const otp = await Otp.findOne({ email, purpose });
  if (!otp) throw httpError(400, "Phiên xác minh đã hết hạn, hãy thực hiện lại");

  await createAndSendOtp({ email, purpose, payload: otp.payload });
  return "Đã gửi lại mã xác minh";
}

async function forgotPassword(body) {
  const email = (body.email || "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw httpError(400, "Email không đúng định dạng");

  const user = await User.findOne({ email, ...CUSTOMER });
  if (!user) throw httpError(404, "Email chưa được đăng ký");
  if (user.status === "inactive") throw httpError(403, "Tài khoản đã bị khóa");

  await createAndSendOtp({ email, purpose: "reset_password" });
  return "Đã gửi mã đặt lại mật khẩu tới email";
}

async function verifyResetOtp(body) {
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  if (!email || !code) throw httpError(400, "Thiếu email hoặc mã OTP");

  await checkOtp(email, "reset_password", code);
  return "Mã xác thực hợp lệ";
}

async function resetPassword(body) {
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  const newPassword = (body.newPassword || "").trim();

  if (!email || !code) throw httpError(400, "Thiếu email hoặc mã OTP");
  if (newPassword.length < 6) throw httpError(400, "Mật khẩu cần ít nhất 6 ký tự");

  await checkOtp(email, "reset_password", code);
  const user = await User.findOne({ email, ...CUSTOMER });
  if (!user) throw httpError(404, "Email chưa được đăng ký");

  user.password_hash = await bcrypt.hash(newPassword, 10);
  await user.save();
  await Otp.deleteMany({ email, purpose: "reset_password" });
  return "Đặt lại mật khẩu thành công";
}

async function login(body) {
  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  if (!email || !password) throw httpError(400, "Email và mật khẩu không được để trống");

  const user = await User.findOne({ email, ...CUSTOMER });
  if (!user) throw httpError(400, "Email đăng nhập không chính xác");
  if (user.status === "inactive") throw httpError(403, "Tài khoản đã bị khóa");

  const matched = await bcrypt.compare(password, user.password_hash || "");
  if (!matched) throw httpError(401, "Mật khẩu không chính xác");
  return user;
}

async function me(userId) {
  const user = await User.findById(userId);
  if (!user || user.status === "inactive" || STAFF_ROLES.includes(user.role)) {
    throw httpError(401, "Phiên đăng nhập không hợp lệ");
  }
  return user;
}

module.exports = {
  register,
  registerVerify,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  login,
  me,
};
