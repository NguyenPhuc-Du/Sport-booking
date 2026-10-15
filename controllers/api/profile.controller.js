const User = require("../../models/user.model");
const { toUser } = require("./user.mapper");

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^0\d{9}$/;

const notifications = [
  {
    type: "success",
    title: "Chào mừng đến SportZone",
    text: "Đặt sân, theo dõi lịch và nạp ví ngay trên ứng dụng.",
    date: "14/10/2026",
  },
  {
    type: "promo",
    title: "Ưu đãi giờ vàng",
    text: "Dùng mã PEAKVIP10 giảm 10% cho các slot buổi tối.",
    date: "14/10/2026",
  },
];

const reviews = [
  {
    facility: "SportPro Complex - Cầu Giấy",
    rating: 5,
    text: "Thảm sân êm, đèn LED nhìn cầu rõ và bãi đỗ xe rộng.",
  },
];

module.exports.index = async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  return res.json({
    user: toUser(user),
    notifications,
    reviews,
  });
};

module.exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });

    const fullName = (req.body.fullName || "").trim();
    const phone = (req.body.phone || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();

    if (!fullName) return res.status(400).json({ message: "Họ tên không được để trống" });
    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ message: "Số điện thoại phải gồm 10 số và bắt đầu bằng 0" });
    }
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ message: "Email không đúng định dạng" });

    const existed = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ email }, { phone }],
    });
    if (existed) {
      if (existed.email === email) return res.status(409).json({ message: "Email này đã được đăng ký" });
      return res.status(409).json({ message: "Số điện thoại này đã được đăng ký" });
    }

    user.fullName = fullName;
    user.phone = phone;
    user.email = email;
    await user.save();
    return res.json({ user: toUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Cập nhật hồ sơ thất bại" });
  }
};
