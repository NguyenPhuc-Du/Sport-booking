const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("Permission", schema, "permissions");
