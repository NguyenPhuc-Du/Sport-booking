const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    is_system: { type: Boolean, default: false },
    is_protected: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("Role", schema, "roles");
