const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true,
    },
    codeHash: {
        type: String,
        enum: ["register", "reset-password"],
        required: true,
    },
    payload: {
        fullName: String,
        phone: String,
        passwordHash: String,
    },
    attempts: {
        type: Number,
        default: 0,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: {
            expires: "5m",
        }
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model("Model", modelSchema);