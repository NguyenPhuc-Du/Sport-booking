const mongoose = require("mongoose");

const receiptItemSchema = new mongoose.Schema(
  {
    drinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drink",
      required: true,
    },
    name: { type: String, required: true },
    costPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const stockReceiptSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
      index: true,
    },
    venueName: { type: String, default: "" },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    supplierName: { type: String, required: true },
    items: { type: [receiptItemSchema], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["received", "cancelled"],
      default: "received",
      index: true,
    },
    receivedAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StockReceipt", stockReceiptSchema, "stock_receipts");
