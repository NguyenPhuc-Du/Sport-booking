module.exports.index = async (req, res) => {
  const tab = req.query.tab || "users";

  res.render("admin/pages/users/index", {
    pageTitle: "Người dùng & Phân quyền",
    activeMenu: "users",
    activeTab: tab,
    users: [
      { id: "usr_customer_1", name: "Nguyễn Minh Quân", phone: "0901 234 567", email: "quan.nm@email.com", wallet: "650.000đ", role: "CUSTOMER", avatar: 11 },
      { id: "usr_owner_1", name: "Trần Thu Hà", phone: "0912 345 678", email: "ha.tt@email.com", wallet: "12.400.000đ", role: "OWNER", avatar: 5 },
      { id: "usr_admin_1", name: "Lê Thanh Bình", phone: "0987 654 321", email: "binh.lt@sportzone.vn", wallet: "0đ", role: "ADMIN", avatar: 12 },
      { id: "usr_customer_2", name: "Phạm Anh Tú", phone: "0933 111 222", email: "tu.pa@email.com", wallet: "120.000đ", role: "CUSTOMER", avatar: 33 },
      { id: "usr_customer_3", name: "Lê Hoàng Nam", phone: "0977 888 999", email: "nam.lh@email.com", wallet: "0đ", role: "CUSTOMER", avatar: 15 },
    ],
    checkins: [
      { id: "chk_1", order: "SPZ-601944", court: "Sân Cầu Lông 02", time: "22/09/2026 18:02", staff: "Nguyễn Văn A (Lễ tân)", method: "Mã QR Hợp lệ" },
      { id: "chk_2", order: "SPZ-601955", court: "Sân Pickleball A", time: "22/09/2026 19:05", staff: "Trần Thị B (Lễ tân)", method: "Mã QR Hợp lệ" },
    ],
    approvals: [
      {
        name: "GreenCourt Tây Hồ",
        address: "18 Xuân La, Tây Hồ, Hà Nội",
        scale: "6 sân",
        owner: "Đỗ Minh Khoa",
        status: "Chờ duyệt hồ sơ",
      },
    ],
  });
};
