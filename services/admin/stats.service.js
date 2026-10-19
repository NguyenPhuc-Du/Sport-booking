const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Venue = require("../../models/facilities.model");

async function bookingsInfo() {
  const found = await mongoose.connection.db
    .listCollections({ name: "bookings" })
    .toArray();
  if (!found.length) return { count: 0, exists: false };
  const count = await mongoose.connection
    .collection("bookings")
    .countDocuments();
  return { count, exists: true };
}

async function getOverview() {
  const ownerRole = await Role.findOne({ code: "OWNER" }).lean();
  const ownerIds = ownerRole
    ? await UserRole.distinct("user_id", { role_id: ownerRole._id })
    : [];
  const bookings = await bookingsInfo();

  return {
    users: await User.countDocuments(),
    owners: ownerIds.length,
    venues: await Venue.countDocuments({
      status: "active",
      deleted: { $ne: true },
    }),
    bookings: bookings.count,
    bookingsExists: bookings.exists,
  };
}

async function listActiveVenues() {
  return Venue.find({ status: "active", deleted: { $ne: true } })
    .select("name address district city status owner_id created_at")
    .populate("owner_id", "fullName email")
    .sort({ created_at: -1 })
    .limit(50)
    .lean();
}

async function listBookings() {
  const info = await bookingsInfo();
  if (!info.exists) return { exists: false, items: [] };
  const items = await mongoose.connection
    .collection("bookings")
    .find({})
    .sort({ _id: -1 })
    .limit(50)
    .toArray();
  return { exists: true, items };
}

module.exports = { getOverview, listActiveVenues, listBookings };
