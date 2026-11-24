const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    drinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drink",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
      index: true,
    },
    venueName: { type: String, default: "" },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, default: "" },
    items: { type: [saleItemSchema], required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "vnpay"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["paid", "cancelled"],
      default: "paid",
      index: true,
    },
    paidAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Sale", saleSchema, "sales");
