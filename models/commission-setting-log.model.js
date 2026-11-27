const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    scope: { type: String, required: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    facility_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    rate_cu: { type: Number, default: null },
    rate_moi: { type: Number, default: null },
    effective_from: { type: Date, required: true },
    note: { type: String, default: "" },
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

module.exports = mongoose.model("CommissionSettingLog", schema, "commission_setting_logs");
