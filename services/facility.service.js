const Venue = require("../models/facilities.model");
const Court = require("../models/court.model");

const SPORTS = [
  { id: "all", label: "Tất cả" },
  { id: "pickleball", label: "Pickleball" },
  { id: "badminton", label: "Cầu lông" },
  { id: "tennis", label: "Tennis" },
  { id: "football", label: "Bóng đá" },
];

function locationOf(v) {
  return [v.address, v.district, v.city].filter(Boolean).join(", ");
}

function hoursOf(v) {
  if (v.open_time && v.close_time) return `${v.open_time} - ${v.close_time}`;
  return "06:00 - 22:00 hàng ngày";
}

async function listForHome({ sport = "all", q = "" } = {}) {
  const filter = { deleted: false, status: "active" };
  if (q.trim()) {
    const re = new RegExp(q.trim(), "i");
    filter.$or = [{ name: re }, { address: re }, { city: re }, { district: re }];
  }

  const venues = await Venue.find(filter).sort({ is_featured: -1, created_at: -1 }).lean();
  const courts = await Court.find({
    venue_id: { $in: venues.map((v) => v._id) },
    deleted: false,
    status: "active",
  }).lean();

  const byVenue = new Map();
  for (const c of courts) {
    const k = String(c.venue_id);
    if (!byVenue.has(k)) byVenue.set(k, []);
    byVenue.get(k).push(c);
  }

  let facilities = venues.map((v) => {
    const list = byVenue.get(String(v._id)) || [];
    const sportIds = [...new Set(list.map((c) => c.sport))];
    return {
      id: String(v._id),
      name: v.name,
      location: locationOf(v),
      rating: 5,
      reviews: 0,
      badge: v.is_featured ? "Nổi bật" : null,
      sports: sportIds,
      sportIds,
      image: v.image_url || "",
    };
  });

  if (sport && sport !== "all") {
    facilities = facilities.filter((f) => f.sportIds.includes(sport));
  }
  return facilities;
}

async function getDetail(id) {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  const v = await Venue.findOne({ _id: id, deleted: false, status: "active" }).lean();
  if (!v) return null;

  const courts = await Court.find({
    venue_id: v._id,
    deleted: false,
    status: { $ne: "inactive" },
  }).lean();

  const sportIds = [...new Set(courts.map((c) => c.sport))];
  return {
    id: String(v._id),
    name: v.name,
    location: locationOf(v),
    hours: hoursOf(v),
    phone: "",
    rating: 5,
    reviews: 0,
    badge: v.is_featured ? "Nổi bật" : null,
    description: v.description || "",
    sports: sportIds,
    sportIds,
    image: v.image_url || "",
    amenities: [],
    images: v.image_url ? [v.image_url] : [],
    courts: courts.map((c) => ({
      id: String(c._id),
      name: c.name,
      surface: c.surface || "",
      capacity: c.capacity || "",
    })),
  };
}

async function getVenueAndCourt(facilityId, courtId) {
  if (!/^[0-9a-fA-F]{24}$/.test(facilityId || "") || !/^[0-9a-fA-F]{24}$/.test(courtId || "")) {
    return null;
  }
  const venue = await Venue.findOne({ _id: facilityId, deleted: false, status: "active" }).lean();
  if (!venue) return null;
  const court = await Court.findOne({
    _id: courtId,
    venue_id: venue._id,
    deleted: false,
    status: "active",
  }).lean();
  if (!court) return null;
  return { venue, court };
}

module.exports = { SPORTS, listForHome, getDetail, getVenueAndCourt };