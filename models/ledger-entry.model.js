const mongoose = require("mongoose");
const { LEDGER_CODES } = require("../services/admin/catalog");

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: LEDGER_CODES, required: true },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    booking_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    booking_code: { type: String, default: "" },
    amount: { type: Number, required: true },
    effect: { type: Number, required: true, default: 0 },
    balance_after: { type: Number, required: true },
    rate: { type: Number, default: null },
    collected: { type: Boolean, default: false },
    settled_booking_ids: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
    },
    note: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

schema.index(
  { booking_id: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: ["payment", "commission", "refund"] },
    },
  },
);
schema.index({ created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ owner_id: 1, created_at: -1 });

module.exports = mongoose.model("LedgerEntry", schema, "ledger_entries");
