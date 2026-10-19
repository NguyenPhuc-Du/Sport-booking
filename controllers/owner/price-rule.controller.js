const mongoose = require("mongoose");
const Court = require("../../models/court.model");
const Venue = require("../../models/facilities.model");
const PriceRule = require("../../models/price-rule.model");
const systemConfig = require("../../config/system");
const searchHelper = require("../../helpers/search");

// [GET] /owner/facilities/price-rules
module.exports.index = async (req, res) => {
  const ownerId = res.locals.user.id;
  const limit = 10;
  const { court, dayType, status, facility } = req.query;

  const facilities = await Venue.find({
    owner_id: ownerId,
    deleted: false,
  }).select("name").sort({ name: 1 }).lean();

  const facilityIds = facilities.map((item) => item._id);
  const currentFacilityId =
    facility &&
    mongoose.Types.ObjectId.isValid(facility) &&
    facilityIds.some((id) => String(id) === String(facility))
      ? facility
      : "";

  const courtFind = {
    venueId: currentFacilityId || { $in: facilityIds },
    deleted: false,
  };
  const courts = await Court.find(courtFind).select("name venueId status").sort({ name: 1 }).lean();
  const courtIds = courts.map((item) => item._id);

  const find = {
    court: { $in: courtIds },
  };

  const objectSearch = searchHelper(req.query);
  if (objectSearch.regex) {
    find.name = objectSearch.regex;
  }

  if (court && mongoose.Types.ObjectId.isValid(court) && courtIds.some((id) => String(id) === String(court))){
    find.court = court;
  }

  if (["weekday", "weekend", "all"].includes(dayType)) {
    find.dayType = dayType;
  }

  if (status === "active" || status === "inactive") {
    find.status = status;
  }

  const totalItems = await PriceRule.countDocuments(find);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  let currentPage = parseInt(req.query.page, 10);
  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const priceRules = await PriceRule.find(find)
    .populate({
      path: "court",
      select: "name venueId",
      populate: { path: "venueId", select: "name" },
    })
    .sort({ timeStart: 1 })
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .lean();

  const allCourts = await Court.countDocuments({
    venueId: { $in: facilityIds },
    deleted: false,
  });
  const maintenanceCount = await Court.countDocuments({
    venueId: { $in: facilityIds },
    deleted: false,
    status: "maintenance",
  });

  res.render("owner/pages/facilities/indexPriceRules", {
    pageTitle: "Bảng giá & Giờ vàng",
    activeMenu: "facilities",
    priceRules,
    courts,
    facilities,
    currentFacilityId,
    courtCount: allCourts,
    facilityCount: facilities.length,
    maintenanceCount,
    query: {
      keyword: objectSearch.keyword,
      facility: currentFacilityId,
      court: find.court && !find.court.$in ? String(find.court) : "",
      dayType: find.dayType || "",
      status: find.status || "",
    },
    pagination: {
      currentPage,
      totalPages,
    },
  });
}

//[GET] /owner/facilities/price-rules/create
module.exports.create = async (req, res) => {
  const ownerId = res.locals.user.id;

  const venues = await Venue.find({
    owner_id: ownerId,
    status: "active",
    deleted: false,
  });

  const venueIds = venues.map((item) => item._id);

  const courts = await Court.find({
    venueId: {
      $in: venueIds,
    },
    deleted: false,
  });

  res.render("owner/pages/facilities/createPriceRules", {
    pageTitle: "Bảng giá",
    error: null,
    values: {},
    courts: [],
    venues,
    courts,
  });
}

//[POST] /owner/facilities/price-rules/create
module.exports.createPost = async (req, res) => {
  try {
    const { venueId, court, dayType } = req.body;
    const payload = {
      name: req.body.name.trim(),
      pricePerHour: Number(req.body.pricePerHour),
      dayType,
      timeStart: req.body.timeStart.trim(),
      timeEnd: req.body.timeEnd.trim(),
    }

    if (!court) {
      const courts = await Court.find({
        venueId,
        deleted: false,
      }).select("_id").lean();

      await PriceRule.insertMany(
        courts.map((item) => ({
          ...payload,
          court: item._id,
        })),
      );
    } else {
      await PriceRule.create({
        ...payload,
        court,
      });
    }

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

  if (!mongoose.Types.ObjectId.isValid(priceRuleId)) {
    req.flash("error", "Bảng giá không tồn tại");
    return res.redirect(listUrl);
  }

  const priceRule = await PriceRule.findOne({
    _id: priceRuleId,
  }).lean();

  if (!priceRule) {
    req.flash("error", "Bảng giá không tồn tại");
    return res.redirect(listUrl);
  }

  const venues = await Venue.find({
    owner_id: ownerId,
    deleted: false,
  }).select("_id name").lean();

  const venueIds = venues.map((item) => item._id);

  const courts = await Court.find({
    venueId: {
      $in: venueIds,
    },
    deleted: false,
  }).lean();

  const currentCourt = courts.find(
    (item) => String(item._id) === String(priceRule.court)
  );

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
    venueId: String(currentCourt.venueId),
  });
}