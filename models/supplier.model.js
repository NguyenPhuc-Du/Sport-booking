const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Supplier", supplierSchema, "suppliers");
