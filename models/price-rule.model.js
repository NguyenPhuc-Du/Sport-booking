const mongoose = require("mongoose");

const priceRuleSchema = new mongoose.Schema({
    court: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court"
    },
    dayType: {
      type: String,
      required: true,
      trim: true,
    },
    timeStart: {
        type: Date,
        required: true
    },
    timeEnd: {
        type: Date,
        required: true
    },
    pricePerHour: {
        type: Number,
        required: true,
        min: 0
    },
    effectiveFrom: {
        type: Date,
        required: true
    },
    effectiveTo: {
        type: Date,
        required: true
    },
},{
    timestamps: true
});

const PriceRule = mongoose.model("PriceRule", priceRuleSchema, "priceRules");

module.exports = PriceRule;   