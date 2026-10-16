const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../../models/user.model");
const Otp = require("../../models/otp.model");
const tokenService = require("../../services/token.service");
const mailService = require("../../services/mail.service");
const { toUser } = require("./user.mapper");

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^0\d{9}$/;
const OTP_TTL_MS = 5 * 60 * 100;
const MAX_ATTEMPTS = 5;


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

async function genOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function createAndSendOtp({email, purpose, payload}) {
  await Otp.deleteMany({email, purpose});

  const code = genOtp();
  const codeHash = await bcrypt.hash(code, 10);

  await Otp.create({
    email, 
    codeHash,
    purpose,
    payload,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  await mailService.sendOtpMail(email,code, purpose);
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

    const existed = await User.findOne({
      $or: [{email}, {phone}]
    });

    if (existed) {
      if (existed.email === email) return fail(res, 409, "Email này đã được đăng ký");

      return fail(res, 409, "Số điện thoại này đã được đăng ký");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await createAndSendOtp({
      email,
      purpose: "register",
      payload: {
        fullName,
        phone,
        passwordHash,
      }
    });

    return res.json({message: "Đã gửi mã xác minh tới email"});
  }
  catch(error) {
    console.error(error);
    return fail(res, 500, "Gửi mã xác minh thất bại");
  }
};

module.exports.registerVerify = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const code = (req.body.code || "").trim();

    if (!email || !code) return fail(res, 400, "Thiếu email hoặc mã OTP");

    const otp = await Otp.findOne({email, purpose: "register"});

    if (!otp || otp.expiresAt < Date.now()) return fail(res, 400, "Mã OTP không hợp lệ hoặc đã hết hạn");

    const ok = await bcrypt.compare(code, otp.codeHash);

    if (!ok) {
      otp.attempts += 1;
      await otp.save();
      return fail(res, 400, "Mã OTP không chính xác");
    }

    const {fullName, phone, passwordHash} = otp.payload || {};

    if (!fullName || !phone || !passwordHash) return fail(res, 400, "Phiên đăng ký không hợp lệ, hãy đăng ký lại");

    const user = await User.create({
      fullName,
      phone,
      email,
      email,
      passwordHash: passwordHash,
    });

    await Otp.deleteMany({email, purpose: "register"});
    return issueSession(res, user, 201);
  }
  catch(error) {
    console.error(error);
    return fail(res, 500, "Xác minh đăng ký thất bại");
  }
};

module.exports.login = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();
    
    if (!email || !password) return fail(res, 400, "Email và mật khẩu không được để trống");

    const user = await User.findOne({email});

    if (!user) return fail(res, 400,"Email đăng nhập không chính xác");

    if (user.status === "inactive") return fail(res, 403, "Tài khoản đã bị khóa");

    const matched = await bcrypt.compare(password, user.passwordHash);

    if (!matched) return fail(res, 401, "Mật khẩu không chính xác");

    return issueSession(res, user, 200);
  }
  catch(error) {
    console.error(error);
    return fail(res, 500, "Đăng nhập thất bại");
  }
};

module.exports.me = async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user || user.status === "inactive") {
    return fail(res, 401, "Phiên đăng nhập không hợp lệ");
  }
  return res.json({user: toUser(user)});
};