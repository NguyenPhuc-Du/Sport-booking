module.exports.index = async (req, res) => {
  res.render("admin/pages/platform/dashboard", {
    pageTitle: "Doanh thu hoa hồng",
    activeMenu: "commissions",
    stats: [
      {
        label: "HOA HỒNG TUẦN",
        value: "12.480.000đ",
        note: "+9.2% so với tuần trước",
        noteClass: "note-green",
        icon: "bi-cash-stack",
        tone: "tone-green",
      },
      {
        label: "TỪ CHỦ SÂN (5%)",
        value: "8.160.000đ",
        note: "65% tổng hoa hồng",
        noteClass: "note-orange",
        icon: "bi-buildings",
        tone: "tone-blue",
      },
      {
        label: "TỪ NGƯỜI DÙNG",
        value: "4.320.000đ",
        note: "Phí dịch vụ / giao dịch",
        noteClass: "note-green",
        icon: "bi-people",
        tone: "tone-violet",
      },
      {
        label: "GIAO DỊCH TUẦN",
        value: "386 đơn",
        note: "Qua 21 cơ sở active",
        noteClass: "note-orange",
        icon: "bi-receipt",
        tone: "tone-amber",
      },
    ],
    ownerCommissions: [
      { facility: "SportPro Complex - Cầu Giấy", owner: "Trần Thu Hà", bookings: 145, gmv: "50.150.000đ", rate: "5%", commission: "2.507.500đ" },
      { facility: "Elite Pickleball Club Landmark", owner: "Đỗ Minh Khoa", bookings: 210, gmv: "68.400.000đ", rate: "5%", commission: "3.420.000đ" },
      { facility: "Star Basketball & Futsal Dome", owner: "Lê Hoàng Nam", bookings: 96, gmv: "31.200.000đ", rate: "5%", commission: "1.560.000đ" },
      { facility: "Arena Tây Hồ", owner: "Phạm Anh Tú", bookings: 72, gmv: "22.800.000đ", rate: "5%", commission: "1.140.000đ" },
    ],
    userFees: [
      { user: "Nguyễn Minh Quân", orders: 8, volume: "1.840.000đ", fee: "92.000đ", method: "VNPAY" },
      { user: "Trần Thu Hà", orders: 5, volume: "1.100.000đ", fee: "55.000đ", method: "MOMO" },
      { user: "Phạm Anh Tú", orders: 3, volume: "720.000đ", fee: "36.000đ", method: "VNPAY" },
      { user: "Lê Hoàng Nam", orders: 4, volume: "980.000đ", fee: "49.000đ", method: "CASH" },
    ],
  });
};
