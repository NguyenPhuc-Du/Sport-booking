const mongoose = require("mongoose");

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const voucherSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    apply_scope: {
      type: String,
      enum: ["court", "drink", "order"],
      default: "court",
      required: true,
    },
    day_type: {
      type: String,
      enum: ["all", "weekday", "weekend"],
      default: "all",
      required: true,
    },
    time_start: {
      type: String,
      default: "",
      validate: {
        validator(v) {
          return !v || HHMM.test(v);
        },
        message: "time_start phải dạng HH:mm",
      },
    },
    time_end: {
      type: String,
      default: "",
      validate: {
        validator(v) {
          return !v || HHMM.test(v);
        },
        message: "time_end phải dạng HH:mm",
      },
    },
    product_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Drink",
      },
    ],
    discount_type: {
      type: String,
      required: true,
      enum: ["percent", "fixed"],
    },
    deleted: {
      type: Boolean,
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
