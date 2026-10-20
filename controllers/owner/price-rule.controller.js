const systemConfig = require("../../config/system");

const facilityService = require("../../services/owner/facility.service");
const priceruleService = require("../../services/owner/price-rule.service");

// [GET] /owner/facilities/price-rules
module.exports.index = async (req, res) => {
  const page = await priceruleService.getPriceRuleIndex(
    res.locals.user.id,
    req.query,
  );

  res.render("owner/pages/facilities/indexPriceRules", {
    pageTitle: "Bảng giá & Giờ vàng",
    activeMenu: "facilities",
    ...page,
  });
}

//[GET] /owner/facilities/price-rules/create
module.exports.create = async (req, res) => {
  const ownerId = res.locals.user.id;

  const venues = await facilityService.getActiveVenuesByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);

  const courts = await facilityService.getCourtsByVenueIds(venueIds);

  res.render("owner/pages/facilities/createPriceRules", {
    pageTitle: "Bảng giá",
    error: null,
    values: {},
    venues,
    courts,
  });
}

//[POST] /owner/facilities/price-rules/create
module.exports.createPost = async (req, res) => {
  try {
    await priceruleService.createPriceRule(req.body);

    req.flash("success", "Tạo bảng giá thành công");
    res.redirect(req.get("Referrer"));
  } catch (error) {
    req.flash("error", "Tạo bảng giá thất bại");
    res.redirect(req.get("Referrer"));
  }
}

//[GET] /owner/facilities/price-rules/edit/:id
module.exports.edit = async (req, res) => {
  const ownerId = res.locals.user.id;
  const priceRuleId = req.params.id;
  const listUrl = `${systemConfig.prefixOwner}/facilities/price-rules`;

  const priceRule = await priceruleService.getPriceRuleById(priceRuleId);

  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);

  const courts = await facilityService.getCourtsByVenueIds(venueIds);
  const currentCourt = courts.find((item) => String(item._id) === String(priceRule.court));

  if (!currentCourt) {
    req.flash("error", "Bảng giá không tồn tại");
    return res.redirect(listUrl);
  }

  res.render("owner/pages/facilities/editPriceRules", {
    pageTitle: "Sửa bảng giá",
    error: null,
    priceRule,
    venues,
    courts,
    venueId: String(currentCourt.venue_id),
  });
}

//[PATCH] /owner/facilities/price-rules/edit/:id
module.exports.editPatch = async (req, res) => {
  try {
    const priceRuleId = req.params.id;

    await priceruleService.updatePriceRule(priceRuleId, req.body);

    req.flash("success", "Cập nhật bảng giá thành công");
    res.redirect(req.get("Referrer"));
  } catch (error) {
    req.flash("error", "Cập nhật bảng giá thất bại");
    res.redirect(req.get("Referrer"));
  }
}