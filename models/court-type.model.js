const mongoose = require("mongoose");

const courtTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icon_url: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CourtType", courtTypeSchema, "court_types");
