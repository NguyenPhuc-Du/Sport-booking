const facilities = require("../../services/owner/facility.service");
const prefixAdmin = require("../../config/system");
const paginationHelper = require("../../helpers/pagination");

const PREFIX = prefixAdmin.prefixOwner;

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
    courts,
    venues,
    countVenues,
    countCourts,
    VenueSelected,
    pagination,
  });
};

module.exports.create = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  const type = await facilities.getAllCourtTypes();
  res.render("owner/pages/facilities/create", {
    pageTitle: "Thêm mới sân con",
    activeMenu: "facilities",
    venues,
    type,
  });
};

module.exports.edit = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  const type = await facilities.getAllCourtTypes();
  const courts = await facilities.getOneCourtsById(req.params.id, userId);
  if (!courts) {
    req.flash("error", "Không tìm thấy sân con");
    return res.redirect(`${PREFIX}/facilities`);
  }
  res.render("owner/pages/facilities/edit", {
    pageTitle: "Sửa sân con",
    activeMenu: "facilities",
    venues,
    type,
    courts,
  });
};

module.exports.detail = async (req, res) => {
  const userId = res.locals.user.id;
  const court = await facilities.getCourtDetailById(req.params.id, userId);
  if (!court) {
    req.flash("error", "Không tìm thấy sân con");
    return res.redirect(`${PREFIX}/facilities`);
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
  try {
    await facilities.createCourtsForOwner(req.body, res.locals.user.id);
    req.flash("success", "Thêm mới sân con thành công");
  } catch (error) {
    req.flash("error", error.message || "Thêm sân con thất bại");
  }
  res.redirect(req.get("Referer") || `${PREFIX}/facilities`);
};

module.exports.editPost = async (req, res) => {
  const userId = res.locals.user.id;
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

  const ok = await facilities.updateOneCourts(req.params.id, body, userId);
  if (!ok) {
    req.flash("error", "Không tìm thấy sân con hoặc không có quyền sửa");
    return res.redirect(`${PREFIX}/facilities`);
  }
  req.flash("success", "Cập nhật sân con thành công");
  res.redirect(`${PREFIX}/facilities`);
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
    venues,
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
    userId,
  });
};

module.exports.createVenuesPost = async (req, res) => {
  try {
    await facilities.createOwner({
      ...req.body,
      owner_id: res.locals.user.id,
    });
    req.flash("success", "Thêm cơ sở thành công");
  } catch (error) {
    req.flash("error", "Thêm cơ sở thất bại");
  }
  res.redirect(req.get("Referer") || `${PREFIX}/facilities/venues`);
};

module.exports.deleteVenues = async (req, res) => {
  try {
    const ok = await facilities.deleteVenues(
      req.params.id,
      res.locals.user.id,
    );
    if (ok) {
      req.flash("success", "Bạn đã xoá cơ sở thành công");
    } else {
      req.flash("error", "Không tìm thấy cơ sở hoặc không có quyền xoá");
    }
  } catch (error) {
    req.flash("error", "Bạn đã xoá cơ sở thất bại");
  }
  res.redirect(req.get("Referer") || `${PREFIX}/facilities/venues`);
};

module.exports.editVenues = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.findVenuesById(req.params.id, userId);
  if (!venues) {
    req.flash("error", "Không tìm thấy cơ sở");
    return res.redirect(`${PREFIX}/facilities/venues`);
  }
  res.render("owner/pages/facilities/editVenues", {
    pageTitle: "Cơ sở",
    activeMenu: "facilities",
    userId,
    venues,
  });
};

module.exports.editVenuesPost = async (req, res) => {
  const ok = await facilities.updateOneVenues(
    req.params.id,
    req.body,
    res.locals.user.id,
  );
  if (!ok) {
    req.flash("error", "Không tìm thấy cơ sở hoặc không có quyền sửa");
  } else {
    req.flash("success", "Thay đổi dữ liệu cơ sở thành công");
  }
  res.redirect(req.get("Referer") || `${PREFIX}/facilities/venues`);
};

module.exports.changeStatus = async (req, res) => {
  const userId = res.locals.user.id;
  const status = req.params.status;
  const ok = await facilities.updateStatusCourts(
    req.params.id,
    status,
    userId,
  );
  if (!ok) {
    req.flash("error", "Không tìm thấy sân hoặc không có quyền đổi trạng thái");
  } else if (status == "active") {
    req.flash("success", "Bảo trì sân thành công");
  } else {
    req.flash("success", "Mở lại sân thành công");
  }
  res.redirect(req.get("Referer") || `${PREFIX}/facilities`);
};
