const StockReceipt = require("../../models/stock-receipt.model");
const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");
const drinkService = require("./drink.service");
const supplierService = require("./supplier.service");
const searchHelper = require("../../helpers/search");
const { applyDateAndAmount, applyVenue, listDocs, sumAmount, findByVenue } = require("../../helpers/loc-phieu");

module.exports.getReceiptForm = async (ownerId) => {
  const { venues, drinks } = await drinkService.listCachedDrinks(ownerId);
  const suppliers = (await supplierService.danhSachDaNho(ownerId))
    .filter((item) => item.status === "active")
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));

  const catalog = drinkService.toCatalog(drinks, true);

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
  } finally {
    drinkService.clearDrinkCache(ownerId);
  }
};

module.exports.buildReceiptFilter = (query, venueIds) => {
  const find = {};

  const objectSearch = searchHelper(query);
  if (objectSearch.regex) {
    find.$or = [
      { code: objectSearch.regex },
      { supplierName: objectSearch.regex },
    ];
  }

  const status = query.status;
  if (status === "received" || status === "cancelled") {
    find.status = status;
  }

  const venueId = applyVenue(find, "venueId", venueIds, query.venueId);
  const range = applyDateAndAmount(find, query, "receivedAt");
  return {
    find,
    filter: {
      keyword: objectSearch.keyword,
      status: find.status || "",
      venueId,
      ...range,
    },
  };
};

module.exports.listReceipts = (find, pagination) => listDocs(StockReceipt, find, pagination);
module.exports.listAllReceipts = (find) => listDocs(StockReceipt, find);
module.exports.totalsForFilter = (find) => sumAmount(StockReceipt, find, "soPhieu");

module.exports.findOwnedReceipt = async (ownerId, receiptId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  return findByVenue(StockReceipt, receiptId, venues.map((item) => item._id));
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
  } finally {
    drinkService.clearDrinkCache(ownerId);
  }
};
