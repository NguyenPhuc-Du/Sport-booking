const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    commissionRate: { type: Number, required: true, min: 0, max: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OwnerRate", schema, "owner_commission_rates");
