const mongoose = require("mongoose");

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/; // để TRƯỚC schema

const priceRuleSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },
    dayType: {
      type: String,
      required: true,
      enum: ["weekday", "weekend", "all"],
    },
    timeStart: { type: String, required: true, match: HHMM },
    timeEnd: { type: String, required: true, match: HHMM },
    pricePerHour: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PriceRule", priceRuleSchema, "priceRules");