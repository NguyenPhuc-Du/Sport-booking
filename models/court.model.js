const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    venue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    court_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourtType",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    surface: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

const Court = mongoose.model("Court", courtSchema, "courts");

module.exports = Court;
