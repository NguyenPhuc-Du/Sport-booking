const userProfile = {
  name: "Nguyễn Minh Quân",
  phone: "0912 345 678",
  email: "minhquan.sport@gmail.com",
  wallet: "650.000đ",
  avatar: "https://i.pravatar.cc/160?img=11",
  badge: "Thành viên VIP",
  joined: "01/2026",
};

module.exports.index = async (req, res) => {
  const tab = req.query.tab || "bookings";
  const filter = req.query.filter || "all";

  const bookings = [
    {
      code: "SPZ-882194",
      status: "upcoming",
      statusLabel: "SẮP DIỄN RA",
      facility: "SportPro Complex - Cầu Giấy",
      court: "Sân Cầu Lông 01 (VIP)",
      date: "2026-09-22",
      time: "18:00 - 20:00",
      amount: "310.000đ",
      courtPrice: "360.000đ",
      bookedAt: "21/9/2026",
    },
    {
      code: "SPZ-881955",
      status: "completed",
      statusLabel: "ĐÃ HOÀN THÀNH",
      facility: "SportPro Complex - Cầu Giấy",
      court: "Sân Cầu Lông 02",
      date: "2026-09-18",
      time: "19:00 - 20:00",
      amount: "180.000đ",
      courtPrice: "180.000đ",
      bookedAt: "17/9/2026",
    },
  ];

  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => b.status === filter);

  res.render("client/pages/profile/index", {
    pageTitle: "Tài khoản của tôi",
    activeNav: "profile",
    activeTab: tab,
    filter,
    saved: req.query.saved === "1",
    user: userProfile,
    bookings: filtered,
    bookingCounts: {
      all: bookings.length,
      upcoming: bookings.filter((b) => b.status === "upcoming").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: 0,
    },
    notifications: [
      {
        type: "success",
        title: "Đặt sân thành công",
        text: "Đơn SPZ-882194 tại SportPro Cầu Giấy đã được xác nhận khung 18:00 - 20:00 ngày 22/09.",
        date: "21/9/2026",
      },
      {
        type: "promo",
        title: "Ưu đãi Giờ Vàng tuần này",
        text: "Dùng mã PEAKVIP10 giảm 10% cho các slot buổi tối.",
        date: "20/9/2026",
      },
      {
        type: "remind",
        title: "Nhắc nhở giờ thi đấu",
        text: "Bạn có lịch cầu lông tại Sân 01 (VIP) vào 18:00 ngày mai.",
        date: "21/9/2026",
      },
      {
        type: "survey",
        title: "Khảo sát chất lượng dịch vụ",
        text: "Hãy đánh giá trải nghiệm gần nhất tại SportPro Complex.",
        date: "19/9/2026",
      },
    ],
    reviews: [
      {
        facility: "SportPro Complex - Cầu Giấy",
        rating: 5,
        text: "Sân cầu lông ở SportPro Cầu Giấy thảm Yonex đánh rất êm chân, trần cao không bị quẩn gió. Đèn LED chống lóa nhìn quả cầu bay cực rõ. Bãi đỗ xe ô tô thoải mái.",
        surface: 5,
        clean: 5,
        service: 5,
      },
    ],
  });
};

module.exports.update = async (req, res) => {
  // Demo UI: nhận form rồi quay lại profile
  res.redirect("/profile?tab=settings&saved=1");
};
