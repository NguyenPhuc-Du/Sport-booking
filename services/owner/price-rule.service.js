const mongoose = require("mongoose");
const PriceRule = require("../../models/price-rule.model");
const Court = require("../../models/court.model");
const searchHelper = require("../../helpers/search");
const facilityService = require("./facility.service");

module.exports.createPriceRule = async (body) => {
  const { venueId, court, dayType } = body;

  // Chuẩn bị payload dữ liệu chung
  const payload = {
    name: body.name ? body.name.trim() : "",
    pricePerHour: Number(body.pricePerHour) || 0,
    dayType,
    timeStart: body.timeStart ? body.timeStart.trim() : "",
    timeEnd: body.timeEnd ? body.timeEnd.trim() : "",
  };

  // Nếu không chọn sân cụ thể  thì áp dụng cho tất cả sân thuộc venueId đó
  if (!court) {
    const courts = await Court.find({
      venue_id: venueId,
      deleted: false,
    })
      .select("_id")
      .lean();

    const priceRulesToInsert = courts.map((item) => ({
      ...payload,
      court: item._id,
    }));

    if (priceRulesToInsert.length > 0) {
      await PriceRule.insertMany(priceRulesToInsert);
    }
  } else {
    // Nếu chọn một sân cụ thể thì tạo 1 bản ghi
    await PriceRule.create({
      ...payload,
      court,
    });
  }
};

module.exports.getPriceRuleById = async (priceRuleId) => {
  if (!mongoose.Types.ObjectId.isValid(priceRuleId)) {
    throw new Error("Bảng giá không tồn tại");
  }

  const priceRule = await PriceRule.findOne({
    _id: priceRuleId,
  }).lean();

  if (!priceRule) {
    throw new Error("Bảng giá không tồn tại");
  }

  return priceRule;
};

module.exports.updatePriceRule = async (priceRuleId, body) => {
  const payload = {
    name: body.name ? body.name.trim() : "",
    court: body.court,
    pricePerHour: Number(body.pricePerHour) || 0,
    dayType: body.dayType,
    timeStart: body.timeStart ? body.timeStart.trim() : "",
    timeEnd: body.timeEnd ? body.timeEnd.trim() : "",
  };

  const updated = await PriceRule.updateOne({ _id: priceRuleId }, payload, {
    runValidators: true,
  });

  if (!updated.matchedCount) {
    throw new Error("Bảng giá không tồn tại");
  }

  return updated;
};

module.exports.getPriceRuleIndex = async (ownerId, query) => {
  const limit = 10;
  const { court, dayType, status, facility } = query;
  const facilities = await facilityService.getAllVenueByOwnerId(ownerId);
  const facilityIds = facilities.map((item) => item._id);
  const currentFacilityId =
    facility &&
    mongoose.Types.ObjectId.isValid(facility) &&
    facilityIds.some((id) => String(id) === String(facility))
      ? facility
      : "";
  const courts = await Court.find({
    venue_id: currentFacilityId || { $in: facilityIds },
    deleted: false,
  })
    .select("name venue_id status")
    .sort({ name: 1 })
    .lean();
  const courtIds = courts.map((item) => item._id);
  const find = { court: { $in: courtIds } };
  const objectSearch = searchHelper(query);
  if (objectSearch.regex) find.name = objectSearch.regex;
  if (
    court &&
    mongoose.Types.ObjectId.isValid(court) &&
    courtIds.some((id) => String(id) === String(court))
  ) {
    find.court = court;
  }
  if (["weekday", "weekend", "all"].includes(dayType)) find.dayType = dayType;
  if (status === "active" || status === "inactive") find.status = status;
  const totalItems = await PriceRule.countDocuments(find);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  let currentPage = parseInt(query.page, 10);
  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const priceRules = await PriceRule.find(find)
    .populate({
      path: "court",
      select: "name venue_id",
      populate: { path: "venue_id", select: "name" },
    })
    .sort({ timeStart: 1 })
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .lean();
  const [courtCount, maintenanceCount] = await Promise.all([
    Court.countDocuments({ venue_id: { $in: facilityIds }, deleted: false }),
    Court.countDocuments({
      venue_id: { $in: facilityIds },
      deleted: false,
      status: "maintenance",
    }),
  ]);
  return {
    priceRules,
    courts,
    facilities,
    currentFacilityId,
    courtCount,
    facilityCount: facilities.length,
    maintenanceCount,
    query: {
      keyword: objectSearch.keyword,
      facility: currentFacilityId,
      court: find.court && !find.court.$in ? String(find.court) : "",
      dayType: find.dayType || "",
      status: find.status || "",
    },
    pagination: { currentPage, totalPages },
  };
};

module.exports.changeStatusPriceRule = async (priceRuleId, status) => {
  if (!mongoose.Types.ObjectId.isValid(priceRuleId)) {
    throw new Error("Bảng giá không tồn tại");
  }
  if (!["active", "inactive"].includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }
  const updated = await PriceRule.updateOne({ _id: priceRuleId }, { status });
  if (!updated.matchedCount) {
    throw new Error("Bảng giá không tồn tại");
  }
  return updated;
};