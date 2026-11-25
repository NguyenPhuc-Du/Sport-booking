const mongoose = require("mongoose");

function danhSachId(ids) {
  return (ids || [])
    .map((id) => String(id && id._id ? id._id : id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function ngayHopLe(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function soTien(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function ganKhoang(find, field, from, to) {
  if (!from && !to) return;
  find[field] = {};
  if (from) find[field].$gte = from;
  if (to) find[field].$lte = to;
}

function ganKhoangTien(find, query) {
  const minAmount = soTien(query.minAmount);
  const maxAmount = soTien(query.maxAmount);
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

function ganNgayVaTien(find, query, truongNgay) {
  const from = ngayHopLe(query.from);
  const to = ngayHopLe(query.to);
  ganKhoang(
    find,
    truongNgay,
    from ? new Date(`${from}T00:00:00.000+07:00`) : "",
    to ? new Date(`${to}T23:59:59.999+07:00`) : "",
  );
  return { from, to, ...ganKhoangTien(find, query) };
}

function ganCoSo(find, field, venueIds, rawId) {
  const ids = danhSachId(venueIds);
  const chosen = danhSachId([rawId]);
  if (chosen.length && ids.some((id) => String(id) === String(chosen[0]))) {
    find[field] = chosen[0];
    return String(chosen[0]);
  }
  find[field] = { $in: ids };
  return "";
}

function lietKe(Model, find, pagination) {
  let query = Model.find(find).sort({ createdAt: -1 });
  if (pagination) query = query.skip(pagination.skipPage).limit(pagination.limitPage);
  return query.lean();
}

async function tongSoTien(Model, find, tenDem) {
  const rows = await Model.aggregate([
    { $match: find },
    { $group: { _id: null, soLuong: { $sum: 1 }, tongTien: { $sum: "$amount" } } },
  ]);
  const soLuong = rows.length ? rows[0].soLuong : 0;
  const tongTien = rows.length ? rows[0].tongTien : 0;
  return { [tenDem]: soLuong, tongTien };
}

function timTheoCoSo(Model, id, venueIds) {
  if (!mongoose.Types.ObjectId.isValid(String(id || ""))) return null;
  return Model.findOne({ _id: id, venueId: { $in: danhSachId(venueIds) } }).lean();
}

module.exports = {
  danhSachId,
  ganKhoang,
  ganNgayVaTien,
  ganKhoangTien,
  ganCoSo,
  lietKe,
  tongSoTien,
  timTheoCoSo,
};
