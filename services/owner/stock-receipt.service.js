const mongoose = require("mongoose");
const StockReceipt = require("../../models/stock-receipt.model");
const Supplier = require("../../models/supplier.model");
const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function ownerVenues(ownerId) {
  return facilityService.getAllVenueByOwnerId(ownerId);
}

async function getReceiptForm(ownerId) {
  const venues = await ownerVenues(ownerId);
  const venueIds = venues.map((venue) => venue._id);
  const [drinks, suppliers] = await Promise.all([
    venueIds.length
      ? Drink.find({ venueId: { $in: venueIds } })
          .select("name price costPrice stock image venueId status")
          .lean()
      : [],
    Supplier.find({ ownerId, status: "active" }).sort({ name: 1 }).lean(),
  ]);

  const catalog = drinks.map((item) => ({
    id: String(item._id),
    name: item.name,
    price: Number(item.price) || 0,
    costPrice: Number(item.costPrice) || 0,
    stock: Number(item.stock) || 0,
    image: item.image || "",
    venueId: String(item.venueId),
    status: item.status,
  }));

  return { venues, catalog, suppliers };
}

async function createReceipt(ownerId, body) {
  const venues = await ownerVenues(ownerId);
  const venueId = String(body.venueId || "").trim();
  const venue = venues.find((item) => String(item._id) === venueId);
  if (!venue) throw fail("Vui lòng chọn cơ sở");

  const supplierId = String(body.supplierId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    throw fail("Vui lòng chọn nhà cung cấp");
  }
  const supplier = await Supplier.findOne({
    _id: supplierId,
    ownerId,
    status: "active",
  }).lean();
  if (!supplier) throw fail("Nhà cung cấp không còn dùng được");

  const posted = parseItems(body.items);
  if (!posted.length) throw fail("Chưa chọn sản phẩm nào");

  const byId = new Map();
  for (const row of posted) {
    const id = String(row.drinkId || row.id || "").trim();
    const qty = Number(row.qty);
    const costPrice = Math.round(Number(row.costPrice));
    if (!mongoose.Types.ObjectId.isValid(id)) throw fail("Sản phẩm không hợp lệ");
    if (!Number.isInteger(qty) || qty < 1) {
      throw fail("Số lượng phải là số nguyên dương");
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      throw fail("Giá nhập không hợp lệ");
    }
    const current = byId.get(id);
    if (current) {
      current.qty += qty;
      current.costPrice = costPrice;
    } else {
      byId.set(id, { qty, costPrice });
    }
  }

  const ids = [...byId.keys()];
  const products = await Drink.find({
    _id: { $in: ids },
    venueId: venue._id,
  }).lean();
  if (products.length !== ids.length) {
    throw fail("Có sản phẩm không thuộc cơ sở này");
  }

  const productMap = new Map(products.map((item) => [String(item._id), item]));
  const items = [];
  let amount = 0;
  for (const [id, row] of byId) {
    const product = productMap.get(id);
    const lineTotal = row.costPrice * row.qty;
    amount += lineTotal;
    items.push({
      drinkId: product._id,
      name: product.name,
      costPrice: row.costPrice,
      qty: row.qty,
      lineTotal,
    });
  }

  const touched = [];
  try {
    for (const item of items) {
      const previous = await Drink.findOneAndUpdate(
        { _id: item.drinkId, venueId: venue._id },
        {
          $inc: { stock: item.qty },
          $set: { costPrice: item.costPrice, supplier: supplier.name },
        },
        { new: false },
      );
      if (!previous) throw fail(`${item.name} không thuộc cơ sở này`);
      touched.push({
        id: item.drinkId,
        qty: item.qty,
        costPrice: Number(previous.costPrice) || 0,
        supplier: previous.supplier || "",
      });
    }

    return await StockReceipt.create({
      code: `PN${Date.now()}`,
      venueId: venue._id,
      venueName: venue.name,
      supplierId: supplier._id,
      supplierName: supplier.name,
      items,
      amount,
      status: "received",
      receivedAt: new Date(),
      createdBy: ownerId,
      note: String(body.note || "").trim().slice(0, 200),
    });
  } catch (error) {
    await Promise.all(
      touched.map((row) =>
        Drink.updateOne(
          { _id: row.id },
          {
            $inc: { stock: -row.qty },
            $set: { costPrice: row.costPrice, supplier: row.supplier },
          },
        ),
      ),
    );
    throw error;
  }
}

function buildReceiptFilter(query, venueIds) {
  const find = { venueId: { $in: venueIds } };
  const venueIdQuery = String(query.venueId || "");
  if (venueIdQuery && venueIds.some((id) => String(id) === venueIdQuery)) {
    find.venueId = venueIdQuery;
  }

  const status = String(query.status || "");
  if (status === "received" || status === "cancelled") find.status = status;

  const keyword = String(query.keyword || "").trim();
  if (keyword) {
    const safe = escapeRegex(keyword);
    find.$or = [
      { code: { $regex: safe, $options: "i" } },
      { supplierName: { $regex: safe, $options: "i" } },
    ];
  }
  return find;
}

async function listReceipts(find, pagination) {
  return StockReceipt.find(find)
    .sort({ createdAt: -1 })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();
}

async function countReceipts(find) {
  return StockReceipt.countDocuments(find);
}

async function getReceiptForOwner(ownerId, receiptId) {
  if (!mongoose.Types.ObjectId.isValid(receiptId)) return null;
  const venues = await ownerVenues(ownerId);
  return StockReceipt.findOne({
    _id: receiptId,
    venueId: { $in: venues.map((venue) => venue._id) },
  }).lean();
}

async function cancelReceipt(ownerId, receiptId) {
  if (!mongoose.Types.ObjectId.isValid(receiptId)) {
    throw fail("Không tìm thấy phiếu nhập");
  }
  const venues = await ownerVenues(ownerId);
  const venueIds = venues.map((venue) => venue._id);
  const receipt = await StockReceipt.findOne({
    _id: receiptId,
    venueId: { $in: venueIds },
    status: "received",
  }).lean();
  if (!receipt) throw fail("Phiếu này đã hủy hoặc không tồn tại");

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
        throw fail(`${item.name} không còn đủ tồn để hủy phiếu nhập`);
      }
      reversed.push(item);
    }

    const cancelled = await StockReceipt.findOneAndUpdate(
      { _id: receipt._id, status: "received" },
      { $set: { status: "cancelled", cancelledAt: new Date() } },
      { new: true },
    ).lean();
    if (!cancelled) throw fail("Phiếu này đã được hủy");
    return cancelled;
  } catch (error) {
    await Promise.all(
      reversed.map((item) =>
        Drink.updateOne(
          { _id: item.drinkId },
          { $inc: { stock: item.qty } },
        ),
      ),
    );
    throw error;
  }
}

module.exports = {
  getReceiptForm,
  createReceipt,
  buildReceiptFilter,
  listReceipts,
  countReceipts,
  getReceiptForOwner,
  cancelReceipt,
};
