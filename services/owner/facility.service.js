const Venues = require("../../models/facilities.model");
const Courts = require("../../models/court.model");
const CourtsType = require("../../models/court-types.model");
const cache = require("../../helpers/memory-cache");

const TTL = 60 * 1000;

module.exports.getAllVenueByOwnerId = async (id) => {
  return cache.remember(`owner:venues:${id}`, TTL, () => {
    return Venues.find({ deleted: false, owner_id: id }).lean();
  });
};
module.exports.findVenuesByOwnerId = async (id, pagination) => {
  return Venues.find({ deleted: false, owner_id: id })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage);
};
module.exports.createOwner = async (body) => {
  const venues = new Venues(body);
  await venues.save();
  cache.clearCatalog();
};
module.exports.getAllCourtTypes = async () => {
  return cache.remember("catalog:court-types", TTL, () =>
    CourtsType.find({}).lean(),
  );
};
module.exports.createCourts = async (body) => {
  const courts = new Courts(body);
  await courts.save();
  cache.clearCatalog();
};
module.exports.deleteVenues = async (id, ownerId) => {
  const result = await Venues.updateOne(
    { _id: id, owner_id: ownerId, deleted: false },
    { deleted: true },
  );
  if (result.modifiedCount > 0) cache.clearCatalog();
  return result.modifiedCount > 0;
};
module.exports.findVenuesById = async (id, ownerId) => {
  const filter = { _id: id, deleted: false };
  if (ownerId) filter.owner_id = ownerId;
  return Venues.findOne(filter);
};
module.exports.updateOneVenues = async (id, body, ownerId) => {
  const filter = { _id: id, deleted: false };
  if (ownerId) filter.owner_id = ownerId;
  const result = await Venues.updateOne(filter, body);
  if (result.matchedCount > 0) cache.clearCatalog();
  return result.matchedCount > 0;
};
async function venueIdsOf(userId) {
  const venues = await Venues.find({
    owner_id: userId,
    deleted: false,
  })
    .select("_id")
    .lean();
  return venues.map((venue) => venue._id);
}

function activeCourtFilter(venueIds) {
  return {
    venue_id: { $in: venueIds },
    deleted: { $ne: true },
  };
}

module.exports.findCourtsByOwnerId = async (userId, pagination) => {
  const venueIds = await venueIdsOf(userId);
  return Courts.find(activeCourtFilter(venueIds))
    .populate("court_type_id", "name icon_url description")
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();
};

module.exports.getActiveVenuesByOwnerId = async (ownerId) => {
  return cache.remember(`owner:venues:active:${ownerId}`, TTL, () => {
    return Venues.find({
      owner_id: ownerId,
      status: "active",
      deleted: false,
    }).lean();
  });
};
module.exports.getCourtsByVenueIds = async (venueIds) => {
  const key = [...venueIds].map(String).sort().join(",");
  return cache.remember(`owner:courts:${key}`, TTL, () => {
    return Courts.find({
      venue_id: { $in: venueIds },
      deleted: { $ne: true },
    }).lean();
  });
};
module.exports.countCourtsByOwner = async (userId) => {
  const venueIds = await venueIdsOf(userId);
  return Courts.countDocuments(activeCourtFilter(venueIds));
};
module.exports.countVenuesByOwner = async (userId) => {
  return Venues.countDocuments({ owner_id: userId, deleted: false });
};
module.exports.countCourtsByVenue = async (venueId, userId) => {
  const venue = await Venues.findOne({
    _id: venueId,
    owner_id: userId,
    deleted: false,
  }).select("_id");
  if (!venue) return 0;
  return Courts.countDocuments(activeCourtFilter([venue._id]));
};
module.exports.findCourtsByIdVenue = async (venueId, pagination, userId) => {
  const venue = await Venues.findOne({
    _id: venueId,
    owner_id: userId,
    deleted: false,
  }).select("_id");
  if (!venue) return [];
  return Courts.find(activeCourtFilter([venue._id]))
    .populate("court_type_id", "name icon_url description")
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();
};
module.exports.assertCourtOwnedBy = async (courtId, ownerId) => {
  const venueIds = await venueIdsOf(ownerId);
  return Courts.findOne({
    _id: courtId,
    venue_id: { $in: venueIds },
    deleted: { $ne: true },
  });
};

module.exports.updateStatusCourts = async (id, status, ownerId) => {
  const nextStatus = status == "active" ? "maintenance" : "active";
  const filter = { _id: id, deleted: { $ne: true } };
  if (ownerId) {
    const venueIds = await venueIdsOf(ownerId);
    filter.venue_id = { $in: venueIds };
  }
  const result = await Courts.updateOne(filter, { status: nextStatus });
  if (result.matchedCount > 0) cache.clearCatalog();
  return result.matchedCount > 0;
};
module.exports.getOneCourtsById = async (id, ownerId) => {
  if (!ownerId) return Courts.findById(id);
  return module.exports.assertCourtOwnedBy(id, ownerId);
};
module.exports.getCourtDetailById = async (id, ownerId) => {
  const filter = { _id: id, deleted: { $ne: true } };
  if (ownerId) {
    const venueIds = await venueIdsOf(ownerId);
    filter.venue_id = { $in: venueIds };
  }
  return Courts.findOne(filter)
    .populate("court_type_id", "name icon_url description")
    .populate(
      "venue_id",
      "name address district city open_time close_time image_url",
    )
    .lean();
};
module.exports.updateOneCourts = async (id, body, ownerId) => {
  const filter = { _id: id, deleted: { $ne: true } };
  if (ownerId) {
    const venueIds = await venueIdsOf(ownerId);
    filter.venue_id = { $in: venueIds };
  }
  const result = await Courts.updateOne(filter, body);
  if (result.matchedCount > 0) cache.clearCatalog();
  return result.matchedCount > 0;
};
module.exports.createCourtsForOwner = async (body, ownerId) => {
  const venue = await Venues.findOne({
    _id: body.venue_id,
    owner_id: ownerId,
    deleted: false,
  }).select("_id");
  if (!venue) {
    const err = new Error("Cơ sở không hợp lệ");
    err.status = 400;
    throw err;
  }
  const courts = new Courts(body);
  await courts.save();
  cache.clearCatalog();
  return courts;
};
