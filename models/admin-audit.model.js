const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    detail: { type: String, default: "" },
    target_type: { type: String, default: "" },
    ip: { type: String, default: "" },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

schema.index({ created_at: -1 });
schema.index({ target_id: 1, created_at: -1 });

schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });

module.exports = mongoose.model("AdminAudit", schema, "admin_audit_logs");
