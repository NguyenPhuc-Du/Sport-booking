const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    group: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    isSensitive: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("Permission", schema, "permissions");
