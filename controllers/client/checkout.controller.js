module.exports.index = async (req, res) => {
  res.render("client/pages/checkout/index", {
    pageTitle: "Xác nhận đặt sân",
    activeNav: "checkout",
    cartCount: 1,
    cartTotal: "180.000đ",
    user: {
      name: "Nguyễn Minh Quân",
      phone: "0912 345 678",
      email: "minhquan.sport@gmail.com",
      wallet: "650.000đ",
      avatar: "https://i.pravatar.cc/100?img=11",
    },
    booking: {
      facility: "SportPro Complex - Cầu Giấy",
      court: "Sân Cầu Lông 01 (VIP)",
      date: "2026-09-25",
      time: "18:00 - 19:00",
      price: "180.000đ",
    },
    vouchers: ["SPORTNEW50", "PEAKVIP10", "PICKLE20"],
    payments: [
      { id: "vnpay", title: "VNPay Gateway", desc: "ATM / Visa / Mastercard / JCB", active: true },
      { id: "momo", title: "Ví Điện Tử MoMo", desc: "Quét mã QR qua ứng dụng MoMo" },
      { id: "vietqr", title: "Chuyển khoản VietQR 24/7", desc: "Mã QR động tự điền STK và nội dung" },
      { id: "onsite", title: "Thanh toán tại sân", desc: "Tiền mặt hoặc thẻ khi check-in" },
    ],
  });
};
