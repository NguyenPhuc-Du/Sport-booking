const Venues = require("../../models/facilities.model");
const Courts = require("../../models/court.model");
const CourtsType = require("../../models/court-types.model");
module.exports.getAllVenueByOwnerId = async (id) => {
  const venues = await Venues.find({ deleted: false, owner_id: id });
  return venues;
};
module.exports.findVenuesByOwnerId = async (id, pagination) => {
  return Venues.find({ deleted: false, owner_id: id })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage);
};
module.exports.createOwner = async (body) => {
  const venues = new Venues(body);
  await venues.save();
};
module.exports.getAllCourtTypes = async (body) => {
  const courtsType = await CourtsType.find({});
  return courtsType;
};
module.exports.createCourts = async (body) => {
  const courts = new Courts(body);
  await courts.save();
};
module.exports.deleteVenues = async (id) => {
  await Venues.updateOne({ _id: id }, { deleted: true });
};
module.exports.findVenuesById = async (id) => {
  const venues = await Venues.findById(id);
  return venues;
};
module.exports.updateOneVenues = async (id, body) => {
  await Venues.updateOne({ _id: id }, body);
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
  return await Venues.find({
    owner_id: ownerId,
    status: "active",
    deleted: false,
  }).lean();
};
module.exports.getCourtsByVenueIds = async (venueIds) => {
  return await Courts.find({
    venue_id: { $in: venueIds },
    deleted: { $ne: true },
  }).lean();
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
module.exports.updateStatusCourts = async (id, status) => {
  if (status) {
    status = status == "active" ? "maintenance" : "active";
  }
  await Courts.updateOne({ _id: id }, { status: status });
};
module.exports.getOneCourtsById = async (id) => {
  const courts = await Courts.findById({ _id: id });
  return courts;
};
module.exports.getCourtDetailById = async (id) => {
  return Courts.findById(id)
    .populate("court_type_id", "name icon_url description")
    .populate(
      "venue_id",
      "name address district city open_time close_time image_url",
    )
    .lean();
};
module.exports.updateOneCourts = async (id, body) => {
  await Courts.updateOne({ _id: id }, body);
};
