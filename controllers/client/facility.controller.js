const facilities = {
  "elite-pickleball": {
    id: "elite-pickleball",
    name: "Elite Pickleball Club Landmark",
    location: "Vinhomes Central Park, Bình Thạnh, TP.HCM",
    hours: "06:00 - 22:30 hàng ngày",
    phone: "0888 777 999",
    rating: 4.95,
    reviews: 210,
    badge: "Cụm sân chuẩn Quốc tế",
    description:
      "Cụm sân pickleball cao cấp với mặt sân cushion acrylic 9 lớp, hệ thống đèn chống chói và khu vực chờ máy lạnh. Phù hợp tập luyện và thi đấu chuyên nghiệp.",
    amenities: [
      "Wifi tốc độ cao",
      "Phòng tắm nóng/lạnh",
      "Cho thuê vợt/bóng",
      "Khu chờ máy lạnh",
      "Bãi đỗ ô tô & xe máy",
      "Đèn LED chống chói",
      "Căn tin / đồ uống",
      "Tủ khóa có mã",
    ],
    images: [
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80",
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80",
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80",
    ],
    courts: [
      { id: "pb-01", name: "Pickleball Sân 01 - View Sông", surface: "Cushion Acrylic 9 lớp • Ngoài trời", capacity: "2 - 4 người" },
      { id: "pb-02", name: "Pickleball Sân 02 - View Sông", surface: "Cushion Acrylic 9 lớp • Ngoài trời", capacity: "2 - 4 người" },
      { id: "pb-03", name: "Pickleball Sân 03 - Vòm Che", surface: "Cushion Acrylic 9 lớp • Ngoài trời", capacity: "2 - 4 người" },
    ],
  },
  "sportpro-cau-giay": {
    id: "sportpro-cau-giay",
    name: "SportPro Complex - Cầu Giấy",
    location: "Quận Cầu Giấy, Hà Nội",
    hours: "06:00 - 23:00 hàng ngày",
    phone: "024 7300 8888",
    rating: 4.9,
    reviews: 142,
    badge: "Cụm sân đa môn",
    description:
      "Tổ hợp sân cầu lông, tennis và bóng đá mini đạt chuẩn thi đấu với hệ thống đặt chỗ realtime và check-in QR.",
    amenities: [
      "Wifi tốc độ cao",
      "Bãi đỗ ô tô & xe máy",
      "Phòng tắm nóng/lạnh",
      "Đèn LED chống chói",
      "Cho thuê vợt/bóng",
      "Căn tin / đồ uống",
    ],
    images: [
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&q=80",
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&q=80",
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80",
    ],
    courts: [
      { id: "bd-01", name: "Sân Cầu Lông 01 (VIP)", surface: "PVC tiêu chuẩn BWF • Trong nhà", capacity: "4 người" },
      { id: "tn-01", name: "Sân Tennis 01", surface: "Hard court • Ngoài trời", capacity: "4 người" },
    ],
  },
};

const defaultFacility = facilities["elite-pickleball"];

module.exports.detail = async (req, res) => {
  const facility = facilities[req.params.id] || defaultFacility;
  res.render("client/pages/facilities/detail", {
    pageTitle: facility.name,
    activeNav: "home",
    facility,
  });
};

module.exports.booking = async (req, res) => {
  const facility = facilities[req.params.id] || defaultFacility;
  const hours = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"];
  const peakHours = new Set(["17", "18", "19", "20", "21"]);

  res.render("client/pages/facilities/booking", {
    pageTitle: `Đặt sân · ${facility.name}`,
    activeNav: "home",
    facility,
    court: facility.courts[0],
    courts: facility.courts,
    dates: [
      { label: "Hôm nay 22/9", sub: "Thứ 2", active: true },
      { label: "23/9", sub: "Thứ 3" },
      { label: "24/9", sub: "Thứ 4" },
      { label: "25/9", sub: "Thứ 5" },
      { label: "26/9", sub: "Thứ 7", tag: "Cuối tuần" },
      { label: "27/9", sub: "Chủ nhật", tag: "Cuối tuần" },
    ],
    slots: hours.map((h) => ({
      time: `${h}:00`,
      price: peakHours.has(h) ? "320.000đ" : "150.000đ",
      peak: peakHours.has(h),
      locked: h === "13",
    })),
  });
};
