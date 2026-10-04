module.exports.index = async (req, res) => {
  res.render("client/pages/wallet/index", {
    pageTitle: "Nạp tiền vào ví",
    activeNav: "profile",
    user: {
      name: "Nguyễn Minh Quân",
      wallet: "650.000đ",
      avatar: "https://i.pravatar.cc/100?img=11",
    },
    amounts: [100000, 200000, 500000, 1000000, 2000000, 5000000],
    methods: [
      {
        id: "vnpay",
        title: "VNPay Gateway",
        desc: "ATM nội địa, Visa, Mastercard, JCB",
        active: true,
      },
      {
        id: "momo",
        title: "Ví điện tử MoMo",
        desc: "Quét mã QR qua ứng dụng MoMo",
        active: false,
      },
      {
        id: "vietqr",
        title: "Chuyển khoản VietQR 24/7",
        desc: "Mã QR động tự điền STK và nội dung",
        active: false,
      },
    ],
    toppedUp: req.query.ok === "1",
  });
};

module.exports.topUp = async (req, res) => {
  // Demo UI
  res.redirect("/wallet?ok=1");
};
