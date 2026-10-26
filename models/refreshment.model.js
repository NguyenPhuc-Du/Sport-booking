const mongoose = require("mongoose");

const refreshmentSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    venueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Venue",
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    costPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    supplier: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        required: true,
        default: "active"
    }
},{
    timestamps: true
});

const Refreshment = mongoose.model("Refreshment", refreshmentSchema, "refreshments");

module.exports = Refreshment;   