const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["register", "reset_password"],
      required: true,
      index: true,
    },
    payload: {
      fullName: String,
      phone: String,
      passwordHash: String,
    },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema, "otps");