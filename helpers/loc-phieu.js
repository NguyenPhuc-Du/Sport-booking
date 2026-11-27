const mongoose = require("mongoose");

function objectIds(ids) {
  return (ids || [])
    .map((id) => String(id && id._id ? id._id : id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function validDate(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function moneyAmount(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function applyRange(find, field, from, to) {
  if (!from && !to) return;
  find[field] = {};
  if (from) find[field].$gte = from;
  if (to) find[field].$lte = to;
}

function applyAmountRange(find, query) {
  const minAmount = moneyAmount(query.minAmount);
  const maxAmount = moneyAmount(query.maxAmount);
  if (minAmount != null || maxAmount != null) {
    find.amount = {};
    if (minAmount != null) find.amount.$gte = minAmount;
    if (maxAmount != null) find.amount.$lte = maxAmount;
  }
  return {
    minAmount: minAmount == null ? "" : String(minAmount),
    maxAmount: maxAmount == null ? "" : String(maxAmount),
  };
}

function applyDateAndAmount(find, query, dateField) {
  const from = validDate(query.from);
  const to = validDate(query.to);
  applyRange(
    find,
    dateField,
    from ? new Date(`${from}T00:00:00.000+07:00`) : "",
    to ? new Date(`${to}T23:59:59.999+07:00`) : "",
  );
  return { from, to, ...applyAmountRange(find, query) };
}

function applyVenue(find, field, venueIds, rawId) {
  const ids = objectIds(venueIds);
  const chosen = objectIds([rawId]);
  if (chosen.length && ids.some((id) => String(id) === String(chosen[0]))) {
    find[field] = chosen[0];
    return String(chosen[0]);
  }
  find[field] = { $in: ids };
  return "";
}

function listDocs(Model, find, pagination) {
  let query = Model.find(find).sort({ createdAt: -1 });
  if (pagination) query = query.skip(pagination.skipPage).limit(pagination.limitPage);
  return query.lean();
}

async function sumAmount(Model, find, countKey) {
  const rows = await Model.aggregate([
    { $match: find },
    { $group: { _id: null, soLuong: { $sum: 1 }, tongTien: { $sum: "$amount" } } },
  ]);
  const soLuong = rows.length ? rows[0].soLuong : 0;
  const tongTien = rows.length ? rows[0].tongTien : 0;
  return { [countKey]: soLuong, tongTien };
}

function findByVenue(Model, id, venueIds) {
  if (!mongoose.Types.ObjectId.isValid(String(id || ""))) return null;
  return Model.findOne({ _id: id, venueId: { $in: objectIds(venueIds) } }).lean();
}

module.exports = {
  objectIds,
  applyRange,
  applyDateAndAmount,
  applyAmountRange,
  applyVenue,
  listDocs,
  sumAmount,
  findByVenue,
};
