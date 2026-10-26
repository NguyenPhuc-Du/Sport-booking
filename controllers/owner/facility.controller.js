const facilities = require("../../services/owner/facility.service");
const Courts = require("../../models/court.model");
const CourtsType = require("../../models/court-types.model");
const prefixAdmin = require("../../config/system");
const paginationHelper = require("../../helpers/pagination");
const Court = require("../../models/court.model");
module.exports.index = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  const countVenues = await facilities.countVenuesByOwner(userId);
  const countCourts = await facilities.countCourtsByOwner(userId);
  const VenueSelected = req.query.id;
  const objectPagination = {
    currentPage: 1,
    limitPage: 4,
  };
  const countPage = VenueSelected
    ? await facilities.countCourtsByVenue(VenueSelected, userId)
    : countCourts;
  const pagination = paginationHelper(objectPagination, req.query, countPage);
  const courts = VenueSelected
    ? await facilities.findCourtsByIdVenue(VenueSelected, pagination, userId)
    : await facilities.findCourtsByOwnerId(userId, pagination);

  res.render("owner/pages/facilities/index", {
    pageTitle: "Quản lý Cơ sở & Sân",
    activeMenu: "facilities",
    courts: courts,
    venues: venues,
    countVenues,
    countCourts,
    VenueSelected,
    pagination: pagination,
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
module.exports.edit = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  const type = await facilities.getAllCourtTypes();
  const courts = await facilities.getOneCourtsById(req.params.id);
  res.render("owner/pages/facilities/edit", {
    pageTitle: "sửa sân con",
    venues,
    type,
    courts,
  });
};
module.exports.detail = async (req, res) => {
  const court = await facilities.getCourtDetailById(req.params.id);
  if (!court) {
    req.flash("error", "Không tìm thấy sân con");
    return res.redirect(`${prefixAdmin.prefixOwner}/facilities`);
  }

  const statusLabel = {
    active: "Đang hoạt động",
    inactive: "Ngưng hoạt động",
    maintenance: "Đang bảo trì",
  };

  res.render("owner/pages/facilities/detail", {
    pageTitle: court.name || "Chi tiết sân con",
    activeMenu: "facilities",
    court,
    statusLabel: statusLabel[court.status] || court.status,
  });
};
module.exports.createPost = async (req, res) => {
  await facilities.createCourts(req.body);
  req.flash("success", "Thêm mới sân con thành công");
  res.redirect(req.get("Referer"));
};
module.exports.editPost = async (req, res) => {
  const kept = [].concat(req.body.keep_image_urls || []);
  const added = req.body.new_image_urls || [];
  const image_urls = [...kept, ...added].slice(0, 6);

  const body = {
    court_type_id: req.body.court_type_id,
    name: req.body.name,
    surface: req.body.surface,
    capacity: req.body.capacity,
    note: req.body.note,
    status: req.body.status,
    image_urls,
  };

  await facilities.updateOneCourts(req.params.id, body);
  req.flash("success", "Cập nhật sân con thành công");
  res.redirect(`${prefixAdmin.prefixOwner}/facilities`);
};
module.exports.indexVenues = async (req, res) => {
  const userId = res.locals.user.id;
  const countVenues = await facilities.countVenuesByOwner(userId);
  const countCourts = await facilities.countCourtsByOwner(userId);
  const pagination = paginationHelper(
    { currentPage: 1, limitPage: 4 },
    req.query,
    countVenues,
  );
  const venues = await facilities.findVenuesByOwnerId(userId, pagination);
  res.render("owner/pages/facilities/indexVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
    venues: venues,
    countVenues,
    countCourts,
    pagination,
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
