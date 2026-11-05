const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "commission" },
    commissionRate: { type: Number, default: 0.05, min: 0, max: 1 },
    payoutCycle: {
      type: String,
      enum: ["weekly", "biweekly", "monthly"],
      default: "weekly",
    },
    minPayout: { type: Number, default: 1000000, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PlatformSetting", schema, "platform_settings");
