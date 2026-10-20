const facilities = require("../../services/owner/facility.service");
const Courts = require("../../models/court.model");
const CourtsType = require("../../models/court-types.model");
const prefixAdmin = require("../../config/system");
const Court = require("../../models/court.model");
const Venue = require("../../models/facilities.model");
module.exports.index = async (req, res) => {
  const userId = res.locals.user.id;
  let courts = "";
  // console.log(courtType);
  const venues = await facilities.getAllVenueByOwnerId(userId);
  console.log(venues);
  const countVenues = await facilities.countVenues();
  const countCourts = await facilities.countCourts();
  const VenueSelected = req.query.id;
  if (VenueSelected) {
    console.log("haha");
    courts = await facilities.findCourtsByIdVenue(VenueSelected);
  } else {
    console.log("hihi");
    courts = await facilities.findCourtsByOwnerId(userId);
  }
  console.log(courts);
  res.render("owner/pages/facilities/index", {
    pageTitle: "Quản lý Cơ sở & Sân",
    activeMenu: "facilities",
    courts: courts,
    venues: venues,
    countVenues,
    countCourts,
    VenueSelected,
  });
};
module.exports.create = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  const type = await facilities.getAllCourtTypes();
  res.render("owner/pages/facilities/create", {
    pageTitle: "Thêm mới sân con",
    venues,
    type,
  });
};
module.exports.createPost = async (req, res) => {
  await facilities.createCourts(req.body);
  req.flash("success", "Thêm mới sân con thành công");
  res.redirect(req.get("Referer"));
};
module.exports.indexVenues = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  const countVenues = await facilities.countVenues();
  const countCourts = await facilities.countCourts();
  res.render("owner/pages/facilities/indexVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
    venues: venues,
    countVenues,
    countCourts,
  });
};
module.exports.createVenues = async (req, res) => {
  const userId = res.locals.user.id;
  res.render("owner/pages/facilities/createVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
    userId: userId,
  });
};
module.exports.createVenuesPost = async (req, res) => {
  console.log(req.body);
  await facilities.createOwner(req.body);
  req.flash("success", "Thêm cơ sở thành công");
  res.redirect(req.get("Referer"));
};
module.exports.deleteVenues = async (req, res) => {
  try {
    const id = req.params.id;
    await facilities.deleteVenues(id);
    req.flash("success", "Bạn đã xoá cơ sở thành công");
    res.redirect(req.get("Referer"));
  } catch (error) {
    req.flash("success", "Bạn đã xoá cơ sở  thất bại");
    res.redirect(req.get("Referer"));
  }
};
module.exports.editVenues = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.findVenuesById(req.params.id);
  res.render("owner/pages/facilities/editVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
    userId: userId,
    venues: venues,
  });
};
module.exports.editVenuesPost = async (req, res) => {
  const id = req.params.id;
  facilities.updateOneVenues(id, req.body);
  req.flash("success", "Thay đổi dữ liệu cơ sở thành công");
  res.redirect(req.get("Referer"));
};
module.exports.changeStatus = async (req, res) => {
  const id = req.params.id;
  let status = req.params.status;
  await facilities.updateStatusCourts(id, status);
  if (status == "active") {
    req.flash("success", "Bảo trì sân thành công");
  } else {
    req.flash("success", "Mở lại sân thành công");
  }
  res.redirect(req.get("Referer"));
};
