const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    path: { type: String, default: "", trim: true },
    icon: { type: String, default: "bi-dot", trim: true },
    parentCode: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
    requiredPermission: { type: String, default: "", trim: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

schema.index({ parentCode: 1, order: 1 });

module.exports = mongoose.model("MenuItem", schema, "menu_items");
