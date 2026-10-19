const Venues = require("../../models/facilities.model");
const Courts = require("../../models/court.model");
module.exports.getAllVenueByOwnerId = async (id) => {
  const venues = await Venues.find({ deleted: false, owner_id: id });
  return venues;
};
module.exports.createOwner = async (body) => {
  const venues = new Venues(body);
  await venues.save();
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
module.exports.findCourtById = async (id) => {
  const courts = await Courts.find({})
    .populate("court_type_id", "name icon_url description")
    .lean();
  return courts;
};
module.exports.updateStatusCourts = async (id, status) => {
  if (status) {
    status = status == "active" ? "maintenance" : "active";
  }
  await Courts.updateOne({ _id: id }, { status: status });
};
module.exports.countCourts = async () => {
  const courts = await Courts.countDocuments({});
  return courts;
};
module.exports.countVenues = async () => {
  const venues = await Venues.countDocuments({ deleted: false });
  return venues;
};
