const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true
    },
    description: String
}, {
    timestamps: true
});

const Role = mongoose.model("Role", roleSchema, "roles");

module.exports = Role;