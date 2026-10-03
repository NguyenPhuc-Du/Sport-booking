const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    phone: {
        type: String,
        unique: true, 
        required: true
    },
    password_hash: String,
    avatar_url: String,
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
},{
    timestamps: true
});

const User = mongoose.model("User", userSchema, "users");

module.exports = User;   