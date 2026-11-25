const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      required: true,
    },
    password_hash: String,
    avatar_url: String,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "USER", "SUPER_ADMIN"],
      default: "USER",
      required: true,
    },
    token_version: {
      type: Number,
      default: 0,
    },
    last_login_at: { type: Date, default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ role: 1, status: 1, createdAt: -1 });
userSchema.index({ deleted_at: 1, role: 1, createdAt: -1 });

const User = mongoose.model("User", userSchema, "users");

module.exports = User;
