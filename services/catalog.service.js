const facilities = [
  {
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
    sportIds: ["pickleball"],
    sports: ["Pickleball"],
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
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
  {
    id: "sportpro-cau-giay",
    name: "SportPro Complex - Cầu Giấy",
    location: "Quận Cầu Giấy, Hà Nội",
    hours: "06:00 - 23:00 hàng ngày",
    phone: "024 7300 8888",
    rating: 4.9,
    reviews: 142,
    badge: "Cụm sân đa môn",
    description:
      "Tổ hợp sân cầu lông, tennis và bóng đá mini đạt chuẩn thi đấu với hệ thống đặt chỗ và check-in QR.",
    sportIds: ["badminton", "tennis"],
    sports: ["Cầu lông", "Tennis"],
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80",
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
  {
    id: "star-dome",
    name: "Star Basketball & Futsal Dome",
    location: "Quận 1, TP. Hồ Chí Minh",
    hours: "06:00 - 22:00 hàng ngày",
    phone: "028 7300 1122",
    rating: 4.85,
    reviews: 67,
    badge: null,
    description: "Nhà thi đấu trong nhà cho bóng rổ và futsal, đèn LED và sàn tiêu chuẩn tập luyện.",
    sportIds: ["basketball", "football"],
    sports: ["Bóng rổ", "Futsal"],
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    amenities: ["Wifi tốc độ cao", "Phòng tắm nóng/lạnh", "Bãi đỗ ô tô & xe máy", "Đèn LED chống chói"],
    images: [
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80",
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&q=80",
    ],
    courts: [
      { id: "bb-01", name: "Sân Bóng Rổ 01", surface: "Sàn gỗ trong nhà", capacity: "10 người" },
      { id: "fs-01", name: "Sân Futsal 01", surface: "Cỏ nhân tạo • Trong nhà", capacity: "10 người" },
    ],
  },
];

const sports = [
  { id: "all", label: "Tất cả môn" },
  { id: "badminton", label: "Cầu lông" },
  { id: "pickleball", label: "Pickleball" },
  { id: "football", label: "Bóng đá mini" },
  { id: "tennis", label: "Quần vợt" },
  { id: "basketball", label: "Bóng rổ" },
];

const amenities = [
  "Wifi tốc độ cao",
  "Bãi đỗ ô tô & xe máy",
  "Phòng tắm nóng/lạnh",
  "Đèn LED chống chói",
  "Cho thuê vợt/bóng",
  "Căn tin / đồ uống",
  "Khu chờ máy lạnh",
  "Tủ khóa có mã",
];

const HOURS = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"];
const PEAK = new Set(["17", "18", "19", "20", "21"]);

function toSummary(facility) {
  return {
    id: facility.id,
    name: facility.name,
    location: facility.location,
    rating: facility.rating,
    reviews: facility.reviews,
    badge: facility.badge,
    sports: facility.sports,
    sportIds: facility.sportIds,
    image: facility.image,
  };
}

function getFacility(id) {
  return facilities.find((item) => item.id === id) || null;
}

function listFacilities({ sport, q } = {}) {
  const query = (q || "").trim().toLowerCase();
  return facilities
    .filter((facility) => {
      const sportOk = !sport || sport === "all" || facility.sportIds.includes(sport);
      const textOk =
        !query ||
        facility.name.toLowerCase().includes(query) ||
        facility.location.toLowerCase().includes(query) ||
        facility.sports.some((name) => name.toLowerCase().includes(query));
      return sportOk && textOk;
    })
    .map(toSummary);
}

function getCourt(facility, courtId) {
  return facility.courts.find((court) => court.id === courtId) || null;
}

function slotPrice(hour) {
  return PEAK.has(hour) ? 320000 : 150000;
}

function localDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function buildSlots(date, isTaken) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const currentHour = today.getHours();

  return HOURS.map((hour) => {
    const time = `${hour}:00`;
    const past = date === todayKey && Number(hour) <= currentHour;
    const taken = isTaken(time);
    return {
      time,
      price: slotPrice(hour),
      peak: PEAK.has(hour),
      available: !past && !taken,
    };
  });
}

function findSlot(date, time, isTaken) {
  return buildSlots(date, isTaken).find((slot) => slot.time === time) || null;
}

const vouchers = [
  { code: "SPORTNEW50", description: "Giảm 50.000đ cho mọi đơn" },
  { code: "PEAKVIP10", description: "Giảm 10% khung giờ vàng" },
  { code: "PICKLE20", description: "Giảm 20% sân pickleball" },
];

const paymentMethods = [
  { id: "wallet", title: "Ví SportZone", description: "Trừ trực tiếp số dư ví" },
  { id: "vnpay", title: "VNPay Gateway", description: "ATM / Visa / Mastercard / JCB" },
  { id: "momo", title: "Ví điện tử MoMo", description: "Quét mã QR qua ứng dụng MoMo" },
  { id: "vietqr", title: "Chuyển khoản VietQR", description: "Mã QR động tự điền nội dung" },
  { id: "onsite", title: "Thanh toán tại sân", description: "Tiền mặt hoặc thẻ khi check-in" },
];

function quotePrice(facility, slot, voucherCode) {
  const code = (voucherCode || "").trim().toUpperCase();
  if (!code) {
    return { courtPrice: slot.price, discount: 0, amount: slot.price, voucherCode: null };
  }
  if (code === "SPORTNEW50") {
    const discount = Math.min(50000, slot.price);
    return { courtPrice: slot.price, discount, amount: slot.price - discount, voucherCode: code };
  }
  if (code === "PEAKVIP10") {
    if (!slot.peak) {
      const error = new Error("Mã PEAKVIP10 chỉ áp dụng cho giờ vàng");
      error.status = 400;
      throw error;
    }
    const discount = Math.round(slot.price * 0.1);
    return { courtPrice: slot.price, discount, amount: slot.price - discount, voucherCode: code };
  }
  if (code === "PICKLE20") {
    const isPickle = facility.sportIds.includes("pickleball");
    if (!isPickle) {
      const error = new Error("Mã PICKLE20 chỉ áp dụng cho sân pickleball");
      error.status = 400;
      throw error;
    }
    const discount = Math.round(slot.price * 0.2);
    return { courtPrice: slot.price, discount, amount: slot.price - discount, voucherCode: code };
  }
  const error = new Error("Mã giảm giá không hợp lệ");
  error.status = 400;
  throw error;
}

module.exports = {
  sports,
  amenities,
  vouchers,
  paymentMethods,
  getFacility,
  getCourt,
  listFacilities,
  buildSlots,
  findSlot,
  quotePrice,
};
