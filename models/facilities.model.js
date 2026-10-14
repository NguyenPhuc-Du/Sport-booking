const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    open_time: {
      type: String, // ví dụ: "06:00"
    },
    close_time: {
      type: String, // ví dụ: "23:00"
    },
    description: {
      type: String,
    },
    image_url: {
      type: String,
      trim: true,
      default: "",
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

const Venue = mongoose.model("Venue", venueSchema, "venues");

module.exports = Venue;
