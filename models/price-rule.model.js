const mongoose = require("mongoose");

const priceRuleSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    court: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court"
    },
    dayType: {
      type: String,
      required: true,
      enum: ["weekday", "weekend", "all"]
    },
    timeStart: {
        type: String,
        required: true,
        match: HHMM
    },
    timeEnd: {
        type: String,
        required: true,
        match: HHMM
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
    status: {
        type: String,
        enum: ["active", "inactive"],
        required: true,
        default: "active"
    }
},{
    timestamps: true
});

const PriceRule = mongoose.model("PriceRule", priceRuleSchema, "priceRules");

module.exports = PriceRule;   