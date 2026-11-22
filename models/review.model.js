const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bookingCode: { type: String, required: true, unique: true, index: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true, index: true },
    facilityName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 300 },
    hidden: { type: Boolean, default: false, index: true },
    ownerReply: { type: String, default: null, trim: true, maxlength: 500 },
    ownerReplyAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reviewSchema.index({ facilityId: 1, hidden: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema, "reviews");
