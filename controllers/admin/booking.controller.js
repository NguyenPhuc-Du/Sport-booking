module.exports.index = async (req, res) => {
  const hours = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];

  res.render("admin/pages/bookings/index", {
    pageTitle: "Lịch đặt & Timeline",
    activeMenu: "bookings",
    hours,
    dateLabel: "2026-09-22",
    dateDisplay: "09/22/2026",
    rows: [
      {
        name: "Sân Cầu Lông 01 (VIP)",
        status: "open",
        slots: { "18": { name: "Quân", id: "2194" }, "19": { name: "Hà", id: "2201" } },
      },
      {
        name: "Sân Cầu Lông 02",
        status: "open",
        slots: { "07": { name: "Nam", id: "2088" }, "17": { name: "Tú", id: "1955" }, "18": { name: "Tú", id: "1955" } },
      },
      {
        name: "Sân Pickleball A",
        status: "open",
        slots: { "19": { name: "Hà", id: "2201" }, "20": { name: "Linh", id: "2210" } },
      },
      {
        name: "Sân Tennis 02",
        status: "maintenance",
        slots: {},
      },
      {
        name: "Sân Bóng Đá Mini 1",
        status: "open",
        slots: { "20": { name: "Team FC", id: "1880" }, "21": { name: "Team FC", id: "1880" } },
      },
    ],
  });
};
