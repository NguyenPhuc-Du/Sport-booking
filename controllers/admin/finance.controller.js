module.exports.index = async (req, res) => {
  res.render("admin/pages/finance/index", {
    pageTitle: "Tài chính & Khuyến mãi",
    activeMenu: "finance",
    activeTab: "vouchers",
    withdrawable: "1.601.700đ",
    // Chủ sân: voucher + đối soát — không có gói SaaS
    vouchers: [
      { code: "SPORTNEW50", program: "Ưu đãi khách mới", discount: "50.000đ", minOrder: "200.000đ", used: 168, limit: 500, from: "2026-09-01", to: "2026-10-31", status: "running" },
      { code: "GOLDTIME20", program: "Giờ vàng giảm 20%", discount: "20%", minOrder: "150.000đ", used: 92, limit: 300, from: "2026-09-10", to: "2026-11-15", status: "running" },
      { code: "LUNCHOFF", program: "Khung giờ trưa", discount: "30.000đ", minOrder: "100.000đ", used: 41, limit: 200, from: "2026-09-01", to: "2026-12-31", status: "running" },
    ],
  });
};
