const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    venue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    discount_type: {
      type: String,
      required: true,
      enum: ["percent", "fixed"],
    },
    deleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    max_discount: {
      type: Number,
      min: 0,
    },
    min_order_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    used_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

const Voucher = mongoose.model("voucher", voucherSchema, "voucher");

module.exports = Voucher;
