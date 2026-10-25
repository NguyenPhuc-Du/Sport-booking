const User = require("../../models/user.model");

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^0\d{9}$/;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw httpError(401, "Phiên đăng nhập không hợp lệ");
  return user;
}

async function updateProfile(userId, body) {
  const user = await getProfile(userId);
  const fullName = (body.fullName || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim().toLowerCase();

  if (!fullName) throw httpError(400, "Họ tên không được để trống");
  if (!PHONE_PATTERN.test(phone)) {
    throw httpError(400, "Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
  }
  if (!EMAIL_PATTERN.test(email)) throw httpError(400, "Email không đúng định dạng");

  const existed = await User.findOne({
    _id: { $ne: user._id },
    $or: [{ email }, { phone }],
  });
  if (existed) {
    if (existed.email === email) throw httpError(409, "Email này đã được đăng ký");
    throw httpError(409, "Số điện thoại này đã được đăng ký");
  }

  user.fullName = fullName;
  user.phone = phone;
  user.email = email;
  await user.save();
  return user;
}

module.exports = { getProfile, updateProfile };
