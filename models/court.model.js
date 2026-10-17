const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
    {
        venueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Venue",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        sport: {
            type: String,
            enum: ["pickleball", "badminton", "tennis", "football", "other"],
            default: "other",
        },
        surface: {
            type: String,
            default: "",
        },
        capacity: {
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
    {timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt",
    }}
);

module.exports = mongoose.model("Court", courtSchema, "courts");