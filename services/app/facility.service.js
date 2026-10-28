const mongoose = require("mongoose");
const Venue = require("../../models/facilities.model");
const Court = require("../../models/court.model");
const CourtType = require("../../models/court-types.model");
const Voucher = require("../../models/finance.model");
const drinkService = require("./drink.service");
const cache = require("../../helpers/memory-cache");

const TTL = 60 * 1000;

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const ACTIVE_VENUE = { deleted: { $ne: true }, status: "active" };
const ACTIVE_COURT = { deleted: { $ne: true }, status: "active" };

function locationOf(v) {
  return [v.address, v.district, v.city].filter(Boolean).join(", ");
}

function hoursOf(v) {
  if (v.open_time && v.close_time) return `${v.open_time} - ${v.close_time}`;
  return "06:00 - 22:00 hàng ngày";
}

async function courtTypes() {
  return cache.remember("catalog:app-court-types", TTL, () => {
    return CourtType.find().sort({ name: 1 }).lean();
  });
}

async function courtTypeMap() {
  const types = await courtTypes();
  return new Map(types.map((t) => [String(t._id), t.name]));
}

async function listSports() {
  const types = await courtTypes();
  return [
    { id: "all", label: "Tất cả" },
    ...types.map((t) => ({ id: String(t._id), label: t.name })),
  ];
}

function sportsOf(courts, typeNames) {
  const ids = [...new Set(courts.map((c) => String(c.court_type_id)).filter((id) => typeNames.has(id)))];
  return { sportIds: ids, sports: ids.map((id) => typeNames.get(id)) };
}

async function listForHome({ sport = "all", q = "" } = {}) {
  const cacheKey = `app:home:${sport}:${q.trim().toLowerCase()}`;
  return cache.remember(cacheKey, TTL, () => loadHome({ sport, q }));
}

async function loadHome({ sport = "all", q = "" } = {}) {
  const filter = { ...ACTIVE_VENUE };
  if (q.trim()) {
    const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { address: re }, { city: re }, { district: re }];
  }

  const venues = await Venue.find(filter).sort({ is_featured: -1, created_at: -1 }).lean();
  const courts = await Court.find({
    ...ACTIVE_COURT,
    venue_id: { $in: venues.map((v) => v._id) },
  }).lean();
  const typeNames = await courtTypeMap();

  const byVenue = new Map();
  for (const c of courts) {
    const k = String(c.venue_id);
    if (!byVenue.has(k)) byVenue.set(k, []);
    byVenue.get(k).push(c);
  }

  let facilities = venues.map((v) => {
    const { sports, sportIds } = sportsOf(byVenue.get(String(v._id)) || [], typeNames);
    return {
      id: String(v._id),
      name: v.name,
      location: locationOf(v),
      rating: 0,
      reviews: 0,
      badge: v.is_featured ? "Nổi bật" : null,
      sports,
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
  if (!OBJECT_ID.test(id || "")) return null;
  return cache.remember(`app:facility:${id}`, TTL, () => loadDetail(id));
}

async function loadDetail(id) {
  const v = await Venue.findOne({ _id: id, ...ACTIVE_VENUE }).lean();
  if (!v) return null;

  const courts = await Court.find({ ...ACTIVE_COURT, venue_id: v._id }).lean();
  const typeNames = await courtTypeMap();
  const { sports, sportIds } = sportsOf(courts, typeNames);

  return {
    id: String(v._id),
    name: v.name,
    location: locationOf(v),
    hours: hoursOf(v),
    phone: v.phone || "",
    rating: 0,
    reviews: 0,
    badge: v.is_featured ? "Nổi bật" : null,
    description: v.description || "",
    sports,
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

async function getVenue(id) {
  if (!OBJECT_ID.test(id || "")) return null;
  return cache.remember(`app:venue:${id}`, TTL, () => {
    return Venue.findOne({ _id: id, ...ACTIVE_VENUE }).lean();
  });
}

async function getCourt(venueId, courtId) {
  if (courtId && !OBJECT_ID.test(courtId)) return null;
  const filter = { ...ACTIVE_COURT, venue_id: venueId };
  if (courtId) filter._id = courtId;
  return Court.findOne(filter).lean();
}

async function getVenueAndCourt(facilityId, courtId) {
  if (!courtId) return null;
  const venue = await getVenue(facilityId);
  if (!venue) return null;
  const court = await getCourt(venue._id, courtId);
  if (!court) return null;
  return { venue, court };
}

async function listCheckoutOptions(facilityId) {
  if (!facilityId || !mongoose.Types.ObjectId.isValid(facilityId)) {
    const err = new Error("Thiếu cơ sở");
    err.status = 400;
    throw err;
  }

  const now = new Date();
  const vouchers = await Voucher.find({
    deleted: false,
    status: "active",
    venue_id: facilityId,
    start_date: { $lte: now },
    end_date: { $gte: now },
  }).select("code name").lean();

  return {
    vouchers: vouchers.map((v) => ({ code: v.code, description: v.name })),
    payments: [
      { id: "vnpay", title: "VNPay", description: "ATM / thẻ / QR ngân hàng" },
    ],
    drinks: await drinkService.listForVenue(facilityId),
  };
}

module.exports = {
  listSports,
  listForHome,
  getDetail,
  getVenue,
  getCourt,
  getVenueAndCourt,
  listCheckoutOptions,
};
