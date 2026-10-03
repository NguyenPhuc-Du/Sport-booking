module.exports.index = async (req, res) => {
  res.render("admin/pages/dashboard/index", {
    pageTitle: "Tổng quan & Thống kê",
    activeMenu: "dashboard",
    stats: [
      {
        label: "DOANH THU TUẦN",
        value: "50.150.000đ",
        note: "+18.4% so với tuần trước",
        noteClass: "note-green",
        icon: "bi-graph-up-arrow",
        tone: "tone-green",
      },
      {
        label: "TỔNG LƯỢT ĐẶT",
        value: "145 lượt",
        note: "+12 đơn mới hôm nay",
        noteClass: "note-orange",
        icon: "bi-calendar2-check",
        tone: "tone-blue",
      },
      {
        label: "TỶ LỆ LẤP ĐẦY SÂN",
        value: "84.2%",
        note: "Giờ vàng (17h-21h) đạt 96%",
        noteClass: "note-orange",
        icon: "bi-percent",
        tone: "tone-amber",
      },
      {
        label: "KHÁCH HÀNG MỚI",
        value: "48 người",
        note: "Tỷ lệ quay lại 65%",
        noteClass: "note-green",
        icon: "bi-people",
        tone: "tone-violet",
      },
    ],
    topCourts: [
      { rank: 1, name: "Sân Cầu Lông 01 (VIP)", sport: "Cầu lông", bookings: 64, revenue: "11.520.000đ", fill: 92 },
      { rank: 2, name: "Sân Pickleball A", sport: "Pickleball", bookings: 51, revenue: "9.180.000đ", fill: 84 },
      { rank: 3, name: "Sân Tennis 02", sport: "Tennis", bookings: 38, revenue: "7.600.000đ", fill: 71 },
      { rank: 4, name: "Sân Bóng Đá Mini 1", sport: "Bóng đá", bookings: 29, revenue: "6.450.000đ", fill: 63 },
    ],
    latestBookings: [
      { code: "SPZ-882194", pay: "VNPAY", customer: "Nguyễn Minh Quân", court: "Sân Cầu Lông 01", time: "22/09 · 18:00-19:00", amount: "180.000đ", status: "approved", statusLabel: "Đã duyệt" },
      { code: "SPZ-882201", pay: "MOMO", customer: "Trần Thu Hà", court: "Sân Pickleball A", time: "22/09 · 19:00-20:00", amount: "220.000đ", status: "pending", statusLabel: "Chờ duyệt" },
      { code: "SPZ-882088", pay: "CASH", customer: "Lê Hoàng Nam", court: "Sân Tennis 02", time: "21/09 · 07:00-08:00", amount: "250.000đ", status: "done", statusLabel: "Hoàn thành" },
      { code: "SPZ-881955", pay: "VNPAY", customer: "Phạm Anh Tú", court: "Sân Bóng Đá Mini 1", time: "21/09 · 20:00-21:00", amount: "450.000đ", status: "approved", statusLabel: "Đã duyệt" },
    ],
  });
};
