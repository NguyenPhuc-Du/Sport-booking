const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: ["mac-dinh", "chu", "san"], required: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    facility_id: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", default: null },
    rate: { type: Number, default: null },
    ke_thua: { type: Boolean, default: false },
    effective_from: { type: Date, required: true },
    note: { type: String, default: "" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

schema.index({ scope: 1, owner_id: 1, facility_id: 1, effective_from: -1 });

module.exports = mongoose.model("CommissionSetting", schema, "commission_settings");
