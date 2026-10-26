const mongoose = require("mongoose");
const Supplier = require("../../models/supplier.model");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalize(body) {
  const name = String(body.name || "").trim().slice(0, 120);
  if (!name) throw fail("Vui lòng nhập tên nhà cung cấp");

  const phone = String(body.phone || "").replace(/\D/g, "");
  if (phone && !/^0\d{9}$/.test(phone)) {
    throw fail("Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
  }

  return {
    name,
    phone,
    address: String(body.address || "").trim().slice(0, 200),
    note: String(body.note || "").trim().slice(0, 200),
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

async function listSuppliers(ownerId, query) {
  const find = { ownerId };
  const status = String(query.status || "");
  if (status === "active" || status === "inactive") find.status = status;

  const keyword = String(query.keyword || "").trim();
  if (keyword) {
    const safe = escapeRegex(keyword);
    const digits = keyword.replace(/\D/g, "");
    find.$or = [
      { name: { $regex: safe, $options: "i" } },
      { address: { $regex: safe, $options: "i" } },
    ];
    if (digits) find.$or.push({ phone: { $regex: digits } });
  }

  return Supplier.find(find).sort({ createdAt: -1 }).lean();
}

async function getSupplier(ownerId, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Supplier.findOne({ _id: id, ownerId }).lean();
}

async function createSupplier(ownerId, body) {
  return Supplier.create({ ...normalize(body), ownerId });
}

async function updateSupplier(ownerId, id, body) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw fail("Không tìm thấy nhà cung cấp");
  const updated = await Supplier.findOneAndUpdate(
    { _id: id, ownerId },
    normalize(body),
    { new: true },
  );
  if (!updated) throw fail("Không tìm thấy nhà cung cấp");
  return updated;
}

async function updateSupplierStatus(ownerId, id, status) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw fail("Không tìm thấy nhà cung cấp");
  const next = status === "inactive" ? "inactive" : "active";
  const updated = await Supplier.findOneAndUpdate(
    { _id: id, ownerId },
    { status: next },
    { new: true },
  );
  if (!updated) throw fail("Không tìm thấy nhà cung cấp");
  return updated;
}

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  updateSupplierStatus,
};
