const Review = require("../../models/review.model");
const Booking = require("../../models/booking.model");
const User = require("../../models/user.model");
const cache = require("../../helpers/memory-cache");

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatDate(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function publicReview(doc, { includeHidden = false } = {}) {
  const r = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(r._id),
    bookingCode: r.bookingCode,
    facilityId: String(r.facilityId),
    facilityName: r.facilityName,
    rating: r.rating,
    text: r.text,
    hidden: !!r.hidden,
    ownerReply: r.ownerReply || null,
    ownerReplyAt: r.ownerReplyAt ? formatDate(r.ownerReplyAt) : null,
    createdAt: formatDate(r.createdAt),
    author: r.author || "",
  };
}

function bustFacilityCache(facilityId) {
  cache.forget("app:home:");
  if (facilityId) cache.forget(`app:facility:${facilityId}`);
}

async function aggregatesForFacilities(facilityIds) {
  if (!facilityIds.length) return new Map();
  const rows = await Review.aggregate([
    {
      $match: {
        facilityId: { $in: facilityIds },
        hidden: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$facilityId",
        count: { $sum: 1 },
        avg: { $avg: "$rating" },
      },
    },
  ]);
  return new Map(
    rows.map((row) => [
      String(row._id),
      { count: row.count, avg: Math.round((row.avg || 0) * 10) / 10 },
    ]),
  );
}

async function listForFacility(facilityId, { includeHidden = false } = {}) {
  const filter = { facilityId };
  if (!includeHidden) filter.hidden = { $ne: true };

  const reviews = await Review.find(filter).sort({ createdAt: -1 }).lean();
  const userIds = [...new Set(reviews.map((r) => String(r.userId)))];
  const users = await User.find({ _id: { $in: userIds } }).select("fullName").lean();
  const nameById = new Map(users.map((u) => [String(u._id), u.fullName || "Người chơi"]));

  return reviews.map((r) =>
    publicReview({
      ...r,
      author: nameById.get(String(r.userId)) || "Người chơi",
    }),
  );
}

async function listMine(userId) {
  const reviews = await Review.find({ userId }).sort({ createdAt: -1 }).lean();
  return reviews.map((r) => publicReview(r));
}

async function mapByBookingCodes(codes) {
  if (!codes.length) return new Map();
  const reviews = await Review.find({ bookingCode: { $in: codes } }).lean();
  return new Map(reviews.map((r) => [r.bookingCode, publicReview(r)]));
}

async function create(userId, { bookingCode, rating, text }) {
  const code = String(bookingCode || "").trim();
  const stars = Number(rating);
  const body = String(text || "").trim();

  if (!code) throw httpError(400, "Thiếu mã đơn");
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw httpError(400, "Số sao phải từ 1 đến 5");
  }
  if (!body) throw httpError(400, "Vui lòng nhập nội dung đánh giá");
  if (body.length > 300) throw httpError(400, "Nội dung tối đa 300 ký tự");

  const booking = await Booking.findOne({ userId, code }).lean();
  if (!booking) throw httpError(404, "Không tìm thấy đơn đặt sân");
  if (booking.status !== "completed") {
    throw httpError(400, "Chỉ đánh giá được sau khi đã vào sân");
  }

  const existed = await Review.findOne({ bookingCode: code }).lean();
  if (existed) throw httpError(409, "Đơn này đã được đánh giá");

  const user = await User.findById(userId).select("fullName").lean();
  const created = await Review.create({
    userId,
    bookingCode: code,
    facilityId: booking.facilityId,
    facilityName: booking.facilityName,
    rating: stars,
    text: body,
  });

  bustFacilityCache(booking.facilityId);
  return publicReview({ ...created.toObject(), author: user?.fullName || "Người chơi" });
}

async function update(userId, reviewId, { rating, text }) {
  const stars = Number(rating);
  const body = String(text || "").trim();

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw httpError(400, "Số sao phải từ 1 đến 5");
  }
  if (!body) throw httpError(400, "Vui lòng nhập nội dung đánh giá");
  if (body.length > 300) throw httpError(400, "Nội dung tối đa 300 ký tự");

  const review = await Review.findOne({ _id: reviewId, userId });
  if (!review) throw httpError(404, "Không tìm thấy đánh giá");

  review.rating = stars;
  review.text = body;
  await review.save();
  bustFacilityCache(review.facilityId);

  const user = await User.findById(userId).select("fullName").lean();
  return publicReview({ ...review.toObject(), author: user?.fullName || "Người chơi" });
}

module.exports = {
  publicReview,
  aggregatesForFacilities,
  listForFacility,
  listMine,
  mapByBookingCodes,
  create,
  update,
  formatDate,
};
