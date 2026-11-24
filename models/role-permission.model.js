const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    permission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

schema.index({ role_id: 1, permission_id: 1 }, { unique: true });

module.exports = mongoose.model("RolePermission", schema, "role_permissions");
