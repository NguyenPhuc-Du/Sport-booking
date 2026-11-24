const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    guestName: { type: String, default: "" },
    guestPhone: { type: String, default: "" },
    code: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending_payment", "upcoming", "completed", "cancelled"],
      default: "pending_payment",
      index: true,
    },
    statusLabel: { type: String, default: "CHỜ THANH TOÁN" },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    facilityName: { type: String, required: true },
    courtId: { type: mongoose.Schema.Types.ObjectId, ref: "Court", required: true },
    courtName: { type: String, required: true },
    date: { type: String, required: true },
    timeStart: { type: String, required: true },
    timeEnd: { type: String, required: true },
    time: { type: String, required: true },
    courtPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    drinks: {
      type: [
        {
          drinkId: { type: mongoose.Schema.Types.ObjectId, ref: "Drink" },
          name: { type: String, required: true },
          price: { type: Number, required: true, min: 0 },
          qty: { type: Number, required: true, min: 1 },
        },
      ],
      default: [],
    },
    drinkTotal: { type: Number, default: 0, min: 0 },
    stockReleased: { type: Boolean, default: false },
    amount: { type: Number, required: true },
    voucherCode: { type: String, default: null },
    paymentMethod: { 
      type: String, 
      enum: ["vnpay", "cash"],
      default: "vnpay" 
    },
    vnpTransactionNo: { type: String, default: null },
    paidAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null }, 
    bookedAt: { type: String, default: "" },
  },
  { timestamps: true }
);

bookingSchema.index(
  { courtId: 1, date: 1, timeStart: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending_payment", "upcoming", "completed"] },
    },
    name: "uniq_active_slot",
  }
);

module.exports = mongoose.model("Booking", bookingSchema, "bookings");