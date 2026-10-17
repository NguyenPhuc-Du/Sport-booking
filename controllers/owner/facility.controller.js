const Venues = require("../../models/facilities.model");
const prefixAdmin = require("../../config/system");
module.exports.index = async (req, res) => {
  res.render("owner/pages/facilities/index", {
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
  const venues = await Venues.find({ deleted: false });

  res.render("owner/pages/facilities/indexVenues", {
    pageTitle: "Cơ sở",
    venues: venues,
  });
};
module.exports.createVenues = async (req, res) => {
  const userId = res.locals.user.id;
  console.log(userId + "user");
  res.render("owner/pages/facilities/createVenues", {
    pageTitle: "Cơ sở",
    userId: userId,
  });
};
module.exports.createVenuesPost = async (req, res) => {
  const venues = new Venues(req.body);
  await venues.save();
  req.flash("success", "Thêm cơ sở thành công");
  res.redirect(req.get("Referer"));
};
module.exports.deleteVenues = async (req, res) => {
  try {
    const id = req.params.id;
    await Venues.updateOne({ _id: id }, { deleted: true });
    req.flash("success", "Bạn đã xoá cơ sở thành công");
    res.redirect(req.get("Referer"));
  } catch (error) {
    req.flash("success", "Bạn đã xoá cơ sở  thất bại");
    res.redirect(req.get("Referer"));
  }
};
