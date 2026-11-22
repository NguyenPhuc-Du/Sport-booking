const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

schema.index({ user_id: 1 }, { unique: true });

module.exports = mongoose.model("UserRole", schema, "user_roles");
