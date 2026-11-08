const StockReceipt = require("../../models/stock-receipt.model");
const Supplier = require("../../models/supplier.model");
const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");
const searchHelper = require("../../helpers/search");

module.exports.getReceiptForm = async (ownerId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);
  const drinks = await Drink.find({ venueId: { $in: venueIds } })
    .select("name price costPrice stock image venueId status")
    .lean();
  const suppliers = await Supplier.find({ ownerId, status: "active" })
    .sort({ name: 1 })
    .lean();

  const catalog = drinks.map((item) => {
    return {
      id: String(item._id),
      name: item.name,
      price: Number(item.price) || 0,
      costPrice: Number(item.costPrice) || 0,
      stock: Number(item.stock) || 0,
      image: item.image || "",
      venueId: String(item.venueId),
      status: item.status,
    };
  });

  return { venues, catalog, suppliers };
};

module.exports.createReceipt = async (ownerId, body) => {
  const touched = [];
  try {
    for (const item of body.items) {
      const previous = await Drink.findOneAndUpdate(
        { _id: item.drinkId, venueId: body.venueId },
        {
          $inc: { stock: item.qty },
          $set: { costPrice: item.costPrice, supplier: body.supplierName },
        },
        { new: false },
      );
      if (!previous) throw new Error(`${item.name} không thuộc cơ sở này`);
      touched.push({
        id: item.drinkId,
        qty: item.qty,
        costPrice: Number(previous.costPrice) || 0,
        supplier: previous.supplier || "",
      });
    }

    return await StockReceipt.create({
      code: `PN${Date.now()}`,
      venueId: body.venueId,
      venueName: body.venueName,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      items: body.items,
      amount: body.amount,
      status: "received",
      receivedAt: new Date(),
      createdBy: ownerId,
      note: body.note || "",
    });
  } catch (error) {
    for (const row of touched) {
      await Drink.updateOne(
        { _id: row.id },
        {
          $inc: { stock: -row.qty },
          $set: { costPrice: row.costPrice, supplier: row.supplier },
        },
      );
    }
    throw error;
  }
};

module.exports.buildReceiptFilter = (query, venueIds) => {
  const find = {};

  // Xử lý tìm kiếm theo mã phiếu, nhà cung cấp
  const objectSearch = searchHelper(query);
  if (objectSearch.regex) {
    find.$or = [
      { code: objectSearch.regex },
      { supplierName: objectSearch.regex },
    ];
  }

  // Xử lý trạng thái
  const status = query.status;
  if (status === "received" || status === "cancelled") {
    find.status = status;
  }

  // Xử lý lọc theo venueId
  const venueIdQuery = query.venueId;
  if (
    venueIdQuery &&
    venueIds.some((id) => String(id) === String(venueIdQuery))
  ) {
    find.venueId = venueIdQuery;
  } else {
    find.venueId = { $in: venueIds };
  }

  return find;
};

module.exports.listReceipts = async (find, pagination) => {
  return await StockReceipt.find(find)
    .sort({ createdAt: -1 })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();
};

module.exports.countReceipts = async (find) => {
  return await StockReceipt.countDocuments(find);
};

module.exports.getReceiptForOwner = async (ownerId, receiptId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);
  return await StockReceipt.findOne({
    _id: receiptId,
    venueId: { $in: venueIds },
  }).lean();
};

module.exports.cancelReceipt = async (ownerId, receiptId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);
  const receipt = await StockReceipt.findOne({
    _id: receiptId,
    venueId: { $in: venueIds },
    status: "received",
  }).lean();
  if (!receipt) throw new Error("Phiếu này đã hủy hoặc không tồn tại");

  const reversed = [];
  try {
    for (const item of receipt.items) {
      const updated = await Drink.findOneAndUpdate(
        {
          _id: item.drinkId,
          venueId: { $in: venueIds },
          stock: { $gte: item.qty },
        },
        { $inc: { stock: -item.qty } },
        { new: true },
      );
      if (!updated) {
        throw new Error(`${item.name} không còn đủ tồn để hủy phiếu nhập`);
      }
      reversed.push(item);
    }

    const cancelled = await StockReceipt.findOneAndUpdate(
      { _id: receipt._id, status: "received" },
      { status: "cancelled", cancelledAt: new Date() },
      { new: true },
    ).lean();
    if (!cancelled) throw new Error("Phiếu này đã được hủy");
    return cancelled;
  } catch (error) {
    for (const item of reversed) {
      await Drink.updateOne({ _id: item.drinkId }, { $inc: { stock: item.qty } });
    }
    throw error;
  }
};
