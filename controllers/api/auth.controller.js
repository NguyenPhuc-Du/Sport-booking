const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../../models/user.model");
const Otp = require("../../models/otp.model");
const tokenService = require("../../services/token.service");
const mailService = require("../../services/mail.service");
const { toUser } = require("./user.mapper");

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^0\d{9}$/;
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PURPOSES = ["register", "reset_password"];
const STAFF_ROLES = ["OWNER", "ADMIN"];
const CUSTOMER = { role: { $nin: STAFF_ROLES } };

function fail(res, status, message) {
  return res.status(status).json({ message });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function issueSession(res, user, statusCode) {
  const token = tokenService.sign(user._id);
  return res.status(statusCode).json({ token, user: toUser(user) });
}

function genOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function createAndSendOtp({ email, purpose, payload }) {
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

module.exports.register = async (req, res) => {
  try {
    const fullName = (req.body.fullName || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const phone = (req.body.phone || "").trim();
    const password = (req.body.password || "").trim();

    if (!fullName) return fail(res, 400, "Họ tên không được để trống");
    if (!PHONE_PATTERN.test(phone)) {
      return fail(res, 400, "Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
    }
    if (!EMAIL_PATTERN.test(email)) return fail(res, 400, "Email không đúng định dạng");
    if (password.length < 6) return fail(res, 400, "Mật khẩu cần ít nhất 6 ký tự");

    const existed = await User.findOne({ $or: [{ email }, { phone }] });
    if (existed) {
      if (existed.email === email) return fail(res, 409, "Email này đã được đăng ký");
      return fail(res, 409, "Số điện thoại này đã được đăng ký");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await createAndSendOtp({
      email,
      purpose: "register",
      payload: { fullName, phone, passwordHash },
    });

    return res.json({ message: "Đã gửi mã xác minh tới email" });
  } catch (error) {
    console.error(error);
    return fail(res, 500, "Gửi mã xác minh thất bại");
  }
};

module.exports.registerVerify = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const code = (req.body.code || "").trim();
    if (!email || !code) return fail(res, 400, "Thiếu email hoặc mã OTP");

    const otp = await checkOtp(email, "register", code);

    const { fullName, phone, passwordHash } = otp.payload || {};
    if (!fullName || !phone || !passwordHash) {
      return fail(res, 400, "Phiên đăng ký không hợp lệ, hãy đăng ký lại");
    }

    const user = await User.create({
      fullName,
      phone,
      email,
      password_hash: passwordHash,
      role: "USER",
    });

    await Otp.deleteMany({ email, purpose: "register" });
    return issueSession(res, user, 201);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    console.error(error);
    return fail(res, 500, "Xác minh đăng ký thất bại");
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const purpose = req.body.purpose;
    if (!email || !PURPOSES.includes(purpose)) return fail(res, 400, "Yêu cầu không hợp lệ");

    const otp = await Otp.findOne({ email, purpose });
    if (!otp) return fail(res, 400, "Phiên xác minh đã hết hạn, hãy thực hiện lại");

    await createAndSendOtp({ email, purpose, payload: otp.payload });
    return res.json({ message: "Đã gửi lại mã xác minh" });
  } catch (error) {
    console.error(error);
    return fail(res, 500, "Gửi lại mã thất bại");
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return fail(res, 400, "Email không đúng định dạng");

    const user = await User.findOne({ email, ...CUSTOMER });
    if (!user) return fail(res, 404, "Email chưa được đăng ký");
    if (user.status === "inactive") return fail(res, 403, "Tài khoản đã bị khóa");

    await createAndSendOtp({ email, purpose: "reset_password" });
    return res.json({ message: "Đã gửi mã đặt lại mật khẩu tới email" });
  } catch (error) {
    console.error(error);
    return fail(res, 500, "Gửi mã thất bại");
  }
};

module.exports.verifyResetOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const code = (req.body.code || "").trim();
    if (!email || !code) return fail(res, 400, "Thiếu email hoặc mã OTP");

    await checkOtp(email, "reset_password", code);

    return res.json({ message: "Mã xác thực hợp lệ" });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    console.error(error);
    return fail(res, 500, "Xác minh mã thất bại");
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const code = (req.body.code || "").trim();
    const newPassword = (req.body.newPassword || "").trim();

    if (!email || !code) return fail(res, 400, "Thiếu email hoặc mã OTP");
    if (newPassword.length < 6) return fail(res, 400, "Mật khẩu cần ít nhất 6 ký tự");

    await checkOtp(email, "reset_password", code);

    const user = await User.findOne({ email, ...CUSTOMER });
    if (!user) return fail(res, 404, "Email chưa được đăng ký");

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Otp.deleteMany({ email, purpose: "reset_password" });

    return res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    console.error(error);
    return fail(res, 500, "Đặt lại mật khẩu thất bại");
  }
};

module.exports.login = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();
    if (!email || !password) return fail(res, 400, "Email và mật khẩu không được để trống");

    const user = await User.findOne({ email, ...CUSTOMER });
    if (!user) return fail(res, 400, "Email đăng nhập không chính xác");
    if (user.status === "inactive") return fail(res, 403, "Tài khoản đã bị khóa");

    const matched = await bcrypt.compare(password, user.password_hash || "");
    if (!matched) return fail(res, 401, "Mật khẩu không chính xác");

    return issueSession(res, user, 200);
  } catch (error) {
    console.error(error);
    return fail(res, 500, "Đăng nhập thất bại");
  }
};

module.exports.me = async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user || user.status === "inactive" || STAFF_ROLES.includes(user.role)) {
    return fail(res, 401, "Phiên đăng nhập không hợp lệ");
  }
  return res.json({ user: toUser(user) });
};