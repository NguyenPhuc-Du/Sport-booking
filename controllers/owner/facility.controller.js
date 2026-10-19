const Venues = require("../../models/facilities.model");
const Courts = require("../../models/court.model");
const CourtsType = require("../../models/court-types.model");
const prefixAdmin = require("../../config/system");
const Court = require("../../models/court.model");
module.exports.index = async (req, res) => {
  const courts = await Courts.find({})
    .populate("court_type_id", "name icon_url description")
    .lean();
  console.log("sssss");
  // console.log(courtType);
  res.render("owner/pages/facilities/index", {
    pageTitle: "Quản lý Cơ sở & Sân",
    activeMenu: "facilities",
    courts: courts,
  });
};
module.exports.indexVenues = async (req, res) => {
  const venues = await Venues.find({ deleted: false });

  res.render("owner/pages/facilities/indexVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
    venues: venues,
  });
};
module.exports.createVenues = async (req, res) => {
  const userId = res.locals.user.id;
  console.log(userId + "user");
  res.render("owner/pages/facilities/createVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
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
module.exports.editVenues = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await Venues.findById(req.params.id);
  res.render("owner/pages/facilities/editVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
    userId: userId,
    venues: venues,
  });
};
module.exports.editVenuesPost = async (req, res) => {
  const id = req.params.id;
  await Venues.updateOne({ _id: id }, req.body);
  req.flash("success", "Thay đổi dữ liệu cơ sở thành công");
  res.redirect(req.get("Referer"));
};
