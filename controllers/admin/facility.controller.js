const Venues = require("../../models/venues.model");
const prefixAdmin = require("../../config/system");
module.exports.index = async (req, res) => {
  res.render("admin/pages/facilities/index", {
    pageTitle: "Quản lý Cơ sở & Sân",
    activeMenu: "facilities",
    activeTab: "courts",
    courts: [
      {
        name: "Sân Cầu Lông 01 (VIP)",
        sport: "badminton",
        surface: "PVC tiêu chuẩn BWF",
        type: "Trong nhà",
        capacity: "4 người",
        status: "active",
      },
      {
        name: "Sân Cầu Lông 02",
        sport: "badminton",
        surface: "PVC tiêu chuẩn",
        type: "Trong nhà",
        capacity: "4 người",
        status: "active",
      },
      {
        name: "Sân Pickleball A",
        sport: "pickleball",
        surface: "Acrylic ngoài trời",
        type: "Ngoài trời",
        capacity: "4 người",
        status: "active",
      },
      {
        name: "Sân Tennis 01",
        sport: "tennis",
        surface: "Hard court",
        type: "Ngoài trời",
        capacity: "4 người",
        status: "active",
      },
      {
        name: "Sân Tennis 02",
        sport: "tennis",
        surface: "Hard court có mái",
        type: "Bán trong nhà",
        capacity: "4 người",
        status: "maintenance",
      },
      {
        name: "Sân Bóng Đá Mini 1",
        sport: "football",
        surface: "Cỏ nhân tạo 5v5",
        type: "Ngoài trời",
        capacity: "10 người",
        status: "active",
      },
    ],
  });
};
module.exports.indexVenues = async (req, res) => {
  const venues = await Venues.find({});
  console.log(venues);
  res.render("admin/pages/facilities/indexVenues", {
    pageTitle: "Cơ sở",
    venues: venues,
  });
};
module.exports.createVenues = async (req, res) => {
  res.render("admin/pages/facilities/createVenues", {
    pageTitle: "Cơ sở",
  });
};
