module.exports.index = async (req, res) => {
  res.render("admin/pages/platform/permissions", {
    pageTitle: "Phân quyền hệ thống",
    activeMenu: "permissions",
    users: [
      { id: "usr_admin_1", name: "Lê Thanh Bình", phone: "0987 654 321", email: "binh.lt@sportzone.vn", wallet: "0đ", role: "ADMIN", avatar: 12 },
      { id: "usr_owner_1", name: "Trần Thu Hà", phone: "0912 345 678", email: "ha.tt@email.com", wallet: "12.400.000đ", role: "OWNER", avatar: 5 },
      { id: "usr_owner_2", name: "Đỗ Minh Khoa", phone: "0908 111 222", email: "khoa.dm@email.com", wallet: "8.200.000đ", role: "OWNER", avatar: 18 },
      { id: "usr_customer_1", name: "Nguyễn Minh Quân", phone: "0901 234 567", email: "quan.nm@email.com", wallet: "650.000đ", role: "CUSTOMER", avatar: 11 },
      { id: "usr_customer_2", name: "Phạm Anh Tú", phone: "0933 111 222", email: "tu.pa@email.com", wallet: "120.000đ", role: "CUSTOMER", avatar: 33 },
    ],
  });
};
