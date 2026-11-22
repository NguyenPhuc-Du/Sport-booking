const Supplier = require("../../models/supplier.model");
const searchHelper = require("../../helpers/search");

module.exports.listSuppliers = async (ownerId, query) => {
  const find = { ownerId };

  // Xử lý tìm kiếm theo tên, địa chỉ, số điện thoại
  const objectSearch = searchHelper(query);
  if (objectSearch.regex) {
    const digits = String(objectSearch.keyword).replace(/\D/g, "");
    find.$or = [
      { name: objectSearch.regex },
      { address: objectSearch.regex },
    ];
    if (digits) find.$or.push({ phone: new RegExp(digits) });
  }

  // Xử lý trạng thái
  const status = query.status;
  if (status === "active" || status === "inactive") {
    find.status = status;
  }

  return await Supplier.find(find).sort({ createdAt: -1 }).lean();
};

module.exports.getSupplier = async (ownerId, id) => {
  return await Supplier.findOne({ _id: id, ownerId }).lean();
};

module.exports.createSupplier = async (ownerId, body) => {
  return await Supplier.create({
    ownerId,
    name: body.name,
    phone: body.phone,
    address: body.address,
    note: body.note,
    status: body.status === "inactive" ? "inactive" : "active",
  });
};

module.exports.updateSupplier = async (ownerId, id, body) => {
  const updated = await Supplier.findOneAndUpdate(
    { _id: id, ownerId },
    {
      name: body.name,
      phone: body.phone,
      address: body.address,
      note: body.note,
      status: body.status === "inactive" ? "inactive" : "active",
    },
    { new: true },
  );
  if (!updated) throw new Error("Không tìm thấy nhà cung cấp");
  return updated;
};

module.exports.updateSupplierStatus = async (ownerId, id, status) => {
  const updated = await Supplier.findOneAndUpdate(
    { _id: id, ownerId },
    { status: status === "inactive" ? "inactive" : "active" },
    { new: true },
  );
  if (!updated) throw new Error("Không tìm thấy nhà cung cấp");
  return updated;
};
