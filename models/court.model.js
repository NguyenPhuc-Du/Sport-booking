const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
    {
        venue_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Venue",
            required: true,
            index: true,
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
            default: "",
        },
        capacity: {
            type: String,
            default: "",
        },
        note: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["active", "inactive", "maintenance"],
            default: "active",
        },
        deleted: {
            type: Boolean,
            default: false,
        },
    },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

module.exports = mongoose.model("Court", courtSchema, "courts");
