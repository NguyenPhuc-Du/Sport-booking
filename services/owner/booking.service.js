const Booking = require("../../models/booking.model");
const facilityService = require("./facility.service");
const { nowInVietnam } = require("../app/slot.service");

const HOURS = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
const DATE_MIN = "2026-10-20";

function formatPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return String(phone || "");
}

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")}đ`;
}

async function ownerVenues(ownerId) {
  return facilityService.getAllVenueByOwnerId(ownerId);
}

async function timelineCourts(venues) {
  const venueIds = venues.map((venue) => venue._id);
  const venueName = new Map(venues.map((venue) => [String(venue._id), venue.name]));
  const courts = await facilityService.getCourtsByVenueIds(venueIds);
  return courts
    .map((court) => ({
      ...court,
      venueName: venueName.get(String(court.venue_id)) || "",
    }))
    .sort((a, b) => {
      const byVenue = String(a.venueName).localeCompare(String(b.venueName), "vi");
      if (byVenue !== 0) return byVenue;
      return String(a.name || "").localeCompare(String(b.name || ""), "vi");
    });
}

function resolveDate(queryDate) {
  const today = nowInVietnam().date;
  const dateMax = today < DATE_MIN ? DATE_MIN : today;

  let date = queryDate || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = dateMax;
  if (date < DATE_MIN) date = DATE_MIN;
  if (date > dateMax) date = dateMax;
  
  return { date, dateMin: DATE_MIN, dateMax };
}

async function getTimelineRows(ownerId, date) {
  const venues = await ownerVenues(ownerId);
  const venueIds = venues.map((venue) => venue._id);
  const courts = await timelineCourts(venues);

  const bookings = await Booking.find({
    facilityId: { $in: venueIds },
    courtId: { $in: courts.map((court) => court._id) },
    date,
    status: { $in: ["pending_payment", "upcoming", "completed"] },
  }).populate("userId", "fullName phone").select("courtId courtName timeStart timeEnd date code userId amount status").lean();

  const slotsByCourt = {};
  for (const booking of bookings) {
    const hour = String(booking.timeStart || "").slice(0, 2);

    if (!HOURS.includes(hour)) continue;
    const key = String(booking.courtId);

    if (!slotsByCourt[key]) slotsByCourt[key] = {};
    const customer = booking.userId || {};

    slotsByCourt[key][hour] = {
      name: customer.fullName || "",
      id: booking.code,
      phone: formatPhone(customer.phone),
      court: booking.courtName || "",
      time: `${booking.timeStart} - ${booking.timeEnd} (${booking.date})`,
      amount: formatMoney(booking.amount),
      status: booking.status,
    };
  }

  const rows = courts.map((court) => ({
    name: court.name,
    venue: court.venueName,
    status: court.status === "active" ? "open" : "maintenance",
    slots: slotsByCourt[String(court._id)] || {},
  }));

  const courtsByVenue = new Set(courts.map((court) => String(court.venue_id)));
  for (const venue of venues) {
    if (courtsByVenue.has(String(venue._id))) continue;
    rows.push({
      name: venue.name,
      venue: "",
      status: "empty",
      slots: {},
    });
  }

  rows.sort((a, b) => {
    const groupA = a.venue || a.name;
    const groupB = b.venue || b.name;
    const byVenue = String(groupA).localeCompare(String(groupB), "vi");
    if (byVenue !== 0) return byVenue;
    return String(a.name).localeCompare(String(b.name), "vi");
  });

  return rows;
}

async function checkIn(ownerId, code) {
  const venueIds = (await ownerVenues(ownerId)).map((venue) => venue._id);
  return Booking.updateOne(
    {
      code,
      facilityId: { $in: venueIds },
      status: { $in: ["pending_payment", "upcoming"] },
    },
    { $set: { status: "completed", statusLabel: "HOÀN THÀNH" } },
  );
}

async function cancel(ownerId, code) {
  const venueIds = (await ownerVenues(ownerId)).map((venue) => venue._id);
  return Booking.updateOne(
    {
      code,
      facilityId: { $in: venueIds },
      status: { $in: ["pending_payment", "upcoming", "completed"] },
    },
    { $set: { status: "cancelled", statusLabel: "ĐÃ HỦY" } },
  );
}

module.exports = {
  HOURS,
  resolveDate,
  getTimelineRows,
  checkIn,
  cancel,
};
