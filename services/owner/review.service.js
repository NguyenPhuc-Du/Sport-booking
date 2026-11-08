const Review = require("../../models/review.model");
const Venue = require("../../models/facilities.model");
const User = require("../../models/user.model");
const Booking = require("../../models/booking.model");
const cache = require("../../helpers/memory-cache");
const { formatDate } = require("../app/review.service");

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function ownerVenueIds(ownerId) {
  const venues = await Venue.find({
    owner_id: ownerId,
    deleted: { $ne: true },
  })
    .select("_id name")
    .lean();
  return venues;
}

async function listForOwner(ownerId) {
  const venues = await ownerVenueIds(ownerId);
  const venueIds = venues.map((v) => v._id);
  if (!venueIds.length) return [];

  const reviews = await Review.find({ facilityId: { $in: venueIds } })
    .sort({ createdAt: -1 })
    .lean();

  const userIds = [...new Set(reviews.map((r) => String(r.userId)))];
  const codes = reviews.map((r) => r.bookingCode);
  const [users, bookings] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("fullName").lean(),
    Booking.find({ code: { $in: codes } }).select("code date time").lean(),
  ]);
  const nameById = new Map(users.map((u) => [String(u._id), u.fullName || "Khách"]));
  const bookingByCode = new Map(bookings.map((b) => [b.code, b]));

  return reviews.map((r) => {
    const booking = bookingByCode.get(r.bookingCode);
    return {
      id: String(r._id),
      venue: r.facilityName,
      customer: nameById.get(String(r.userId)) || "Khách",
      bookingCode: r.bookingCode,
      rating: r.rating,
      comment: r.text,
      createdAt: formatDate(r.createdAt),
      slot: booking ? `${booking.date} · ${booking.time}` : "—",
      reply: r.ownerReply || "",
      replyDate: r.ownerReplyAt ? formatDate(r.ownerReplyAt) : "",
      hidden: !!r.hidden,
    };
  });
}

async function assertOwnerReview(ownerId, reviewId) {
  const review = await Review.findById(reviewId);
  if (!review) throw httpError(404, "Không tìm thấy đánh giá");
  const venue = await Venue.findOne({
    _id: review.facilityId,
    owner_id: ownerId,
    deleted: { $ne: true },
  }).lean();
  if (!venue) throw httpError(403, "Không có quyền với đánh giá này");
  return review;
}

async function reply(ownerId, reviewId, replyText) {
  const text = String(replyText || "").trim();
  if (!text) throw httpError(400, "Nội dung phản hồi không được trống");
  if (text.length > 500) throw httpError(400, "Phản hồi tối đa 500 ký tự");

  const review = await assertOwnerReview(ownerId, reviewId);
  review.ownerReply = text;
  review.ownerReplyAt = new Date();
  await review.save();
  cache.forget(`app:facility:${review.facilityId}`);
  cache.forget("app:home:");
  return {
    reply: review.ownerReply,
    replyDate: formatDate(review.ownerReplyAt),
  };
}

async function toggleHidden(ownerId, reviewId) {
  const review = await assertOwnerReview(ownerId, reviewId);
  review.hidden = !review.hidden;
  await review.save();
  cache.forget(`app:facility:${review.facilityId}`);
  cache.forget("app:home:");
  return { hidden: review.hidden };
}

module.exports = { listForOwner, reply, toggleHidden };
