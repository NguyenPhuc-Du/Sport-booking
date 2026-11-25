const Supplier = require("../../models/supplier.model");
const { nho, xoa } = require("../../helpers/nho-chu-san");

function trangThai(status) {
  return status === "inactive" ? "inactive" : "active";
}

function xoaBanNho(ownerId) {
  xoa(`owner:suppliers:${ownerId}`);
}

function danhSachDaNho(ownerId) {
  return nho(`owner:suppliers:${ownerId}`, () => {
    return Supplier.find({ ownerId }).sort({ createdAt: -1 }).lean();
  });
}

module.exports.getSupplier = async (ownerId, id) => {
  return await Supplier.findOne({ _id: id, ownerId }).lean();
};

module.exports.createSupplier = async (ownerId, body) => {
  const created = await Supplier.create({
    ownerId,
    name: body.name,
    phone: body.phone,
    address: body.address,
    note: body.note,
    status: trangThai(body.status),
  });
  xoaBanNho(ownerId);
  return created;
};

module.exports.updateSupplier = async (ownerId, id, body) => {
  const updated = await Supplier.findOneAndUpdate(
    { _id: id, ownerId },
    {
      name: body.name,
      phone: body.phone,
      address: body.address,
      note: body.note,
      status: trangThai(body.status),
    },
    { new: true },
  );
  if (!updated) throw new Error("Không tìm thấy nhà cung cấp");
  xoaBanNho(ownerId);
  return updated;
};

module.exports.updateSupplierStatus = async (ownerId, id, status) => {
  const updated = await Supplier.findOneAndUpdate(
    { _id: id, ownerId },
    { status: trangThai(status) },
    { new: true },
  );
  if (!updated) throw new Error("Không tìm thấy nhà cung cấp");
  xoaBanNho(ownerId);
  return updated;
};

module.exports.danhSachDaNho = danhSachDaNho;
