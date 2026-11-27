const mongoose = require("mongoose");
const PriceRule = require("../../models/price-rule.model");
const Court = require("../../models/court.model");
const searchHelper = require("../../helpers/search");
const facilityService = require("./facility.service");
const cache = require("../../helpers/memory-cache");
const { nho } = require("../../helpers/nho-chu-san");

function trimmed(value) {
  return value ? String(value).trim() : "";
}

function priceFields(body) {
  return {
    name: trimmed(body.name),
    pricePerHour: Number(body.pricePerHour) || 0,
    dayType: body.dayType,
    timeStart: trimmed(body.timeStart),
    timeEnd: trimmed(body.timeEnd),
  };
}

function missingPriceRule() {
  return new Error("Bảng giá không tồn tại");
}

function listedId(value, ids) {
  if (!value || !ids.some((id) => String(id) === String(value))) return "";
  return value;
}

module.exports.createPriceRule = async (body) => {
  const { venueId, court } = body;
  const payload = priceFields(body);

  // Không chọn sân: tạo cùng một bảng giá cho mọi sân của cơ sở.
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
    await PriceRule.create({ ...payload, court });
  }
  cache.clearCatalog();
};

module.exports.getPriceRuleById = async (priceRuleId) => {
  if (!mongoose.Types.ObjectId.isValid(priceRuleId)) throw missingPriceRule();

  const priceRule = await PriceRule.findOne({
    _id: priceRuleId,
  }).lean();

  if (!priceRule) throw missingPriceRule();

  return priceRule;
};

module.exports.updatePriceRule = async (priceRuleId, body) => {
  const payload = { ...priceFields(body), court: body.court };

  const updated = await PriceRule.updateOne({ _id: priceRuleId }, payload, {
    runValidators: true,
  });

  if (!updated.matchedCount) throw missingPriceRule();

  cache.clearCatalog();
  return updated;
};

async function loadPriceRulePage(ownerId, query) {
  const limit = 10;
  const { court, dayType, status, facility } = query;

  const facilities = await facilityService.getAllVenueByOwnerId(ownerId);
  const facilityIds = facilities.map((item) => item._id);

  const currentFacilityId = listedId(facility, facilityIds);

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
  if (objectSearch.regex) {
    find.name = objectSearch.regex;
  }

  const pickedCourt = listedId(court, courtIds);
  const selectedCourt = pickedCourt ? String(pickedCourt) : "";
  if (pickedCourt) find.court = pickedCourt;

  if (["weekday", "weekend", "all"].includes(dayType)) find.dayType = dayType;
  if (["active", "inactive"].includes(status)) find.status = status;

  const courtFilter = { venue_id: { $in: facilityIds }, deleted: false };
  const [totalItems, courtCount, maintenanceCount] = await Promise.all([
    PriceRule.countDocuments(find),
    Court.countDocuments(courtFilter),
    Court.countDocuments({ ...courtFilter, status: "maintenance" }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  let currentPage = parseInt(query.page, 10) || 1;
  if (currentPage < 1) currentPage = 1;
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
      court: selectedCourt,
      dayType: find.dayType || "",
      status: find.status || "",
    },
    pagination: { currentPage, totalPages },
  };
}

module.exports.getPriceRuleIndex = (ownerId, query) => {
  const key = [
    "owner:price-rules",
    String(ownerId),
    query.page || "1",
    query.keyword || "",
    query.facility || "",
    query.court || "",
    query.dayType || "",
    query.status || "",
  ].join(":");
  return nho(key, () => loadPriceRulePage(ownerId, query));
};

module.exports.changeStatusPriceRule = async (priceRuleId, status) => {
  if (!mongoose.Types.ObjectId.isValid(priceRuleId)) throw missingPriceRule();
  if (!["active", "inactive"].includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }
  const updated = await PriceRule.updateOne({ _id: priceRuleId }, { status });
  if (!updated.matchedCount) throw missingPriceRule();
  cache.clearCatalog();
  return updated;
};