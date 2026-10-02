const mongoose = require("mongoose");

const userRoleSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true
    },
    assigned_at: {
        type: Date,
        default: Date.now
    }
});

userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

const UserRole = mongoose.model("UserRole", userRoleSchema, "user_roles");

module.exports = UserRole;