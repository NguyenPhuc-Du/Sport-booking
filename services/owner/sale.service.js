const mongoose = require("mongoose");
const Sale = require("../../models/sale.model");
const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");

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

async function getSaleCatalog(ownerId) {
  const venues = await ownerVenues(ownerId);
  const venueIds = venues.map((venue) => venue._id);
  const drinks = venueIds.length
    ? await Drink.find({ venueId: { $in: venueIds } })
        .select("name price stock image venueId status")
        .lean()
    : [];

  const catalog = drinks.map((item) => ({
    id: String(item._id),
    name: item.name,
    price: Number(item.price) || 0,
    stock: Number(item.stock) || 0,
    image: item.image || "",
    venueId: String(item.venueId),
    status: item.status,
  }));

  return { venues, catalog };
}

async function createWalkInSale(ownerId, body) {
  const venues = await ownerVenues(ownerId);
  const venueId = String(body.venueId || "").trim();
  const venue = venues.find((item) => String(item._id) === venueId);
  if (!venue) throw fail("Vui lòng chọn cơ sở");

  const guestName = String(body.guestName || "").trim();
  if (!guestName) throw fail("Vui lòng nhập tên khách");

  const phone = String(body.guestPhone || "").replace(/\D/g, "");
  if (phone && !/^0\d{9}$/.test(phone)) {
    throw fail("Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
  }

  const posted = parseItems(body.items);
  if (!posted.length) throw fail("Chưa chọn sản phẩm nào");

  const qtyById = new Map();
  for (const row of posted) {
    const id = String(row.drinkId || row.id || "").trim();
    const qty = Number(row.qty);
    if (!mongoose.Types.ObjectId.isValid(id)) throw fail("Sản phẩm không hợp lệ");
    if (!Number.isInteger(qty) || qty < 1) {
      throw fail("Số lượng phải là số nguyên dương");
    }
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }

  const ids = [...qtyById.keys()];
  const products = await Drink.find({
    _id: { $in: ids },
    venueId: venue._id,
    status: "active",
  }).lean();

  if (products.length !== ids.length) {
    throw fail("Có sản phẩm không thuộc cơ sở này hoặc đã ngừng bán");
  }

  const productMap = new Map(products.map((item) => [String(item._id), item]));
  const items = [];
  let amount = 0;

  for (const [id, qty] of qtyById) {
    const product = productMap.get(id);
    const stock = Number(product.stock) || 0;
    if (qty > stock) {
      throw fail(`${product.name} chỉ còn ${stock} sản phẩm`);
    }
    const price = Number(product.price) || 0;
    const lineTotal = price * qty;
    amount += lineTotal;
    items.push({
      drinkId: product._id,
      name: product.name,
      price,
      qty,
      lineTotal,
    });
  }

  const decremented = [];
  try {
    for (const item of items) {
      const updated = await Drink.findOneAndUpdate(
        { _id: item.drinkId, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } },
        { new: true },
      );
      if (!updated) throw fail(`${item.name} không đủ tồn kho`);
      decremented.push(item);
    }

    return await Sale.create({
      code: `SLZ${Date.now()}`,
      venueId: venue._id,
      venueName: venue.name,
      guestName,
      guestPhone: phone,
      items,
      amount,
      paymentMethod: body.paymentMethod === "vnpay" ? "vnpay" : "cash",
      status: "paid",
      paidAt: new Date(),
      createdBy: ownerId,
      note: String(body.note || "").trim().slice(0, 200),
    });
  } catch (error) {
    await Promise.all(
      decremented.map((item) =>
        Drink.updateOne(
          { _id: item.drinkId },
          { $inc: { stock: item.qty } },
        ),
      ),
    );
    throw error;
  }
}

function buildSaleFilter(query, venueIds) {
  const find = { venueId: { $in: venueIds } };
  const venueIdQuery = String(query.venueId || "");
  if (venueIdQuery && venueIds.some((id) => String(id) === venueIdQuery)) {
    find.venueId = venueIdQuery;
  }

  const keyword = String(query.keyword || "").trim();
  if (keyword) {
    const digits = keyword.replace(/\D/g, "");
    find.$or = [
      { code: { $regex: keyword, $options: "i" } },
      { guestName: { $regex: keyword, $options: "i" } },
    ];
    if (digits) find.$or.push({ guestPhone: { $regex: digits } });
  }
  return find;
}

async function listSales(find, pagination) {
  return Sale.find(find)
    .sort({ createdAt: -1 })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();
}

async function countSales(find) {
  return Sale.countDocuments(find);
}

async function getSaleForOwner(ownerId, saleId) {
  if (!mongoose.Types.ObjectId.isValid(saleId)) return null;
  const venues = await ownerVenues(ownerId);
  return Sale.findOne({
    _id: saleId,
    venueId: { $in: venues.map((venue) => venue._id) },
  }).lean();
}

module.exports = {
  getSaleCatalog,
  createWalkInSale,
  buildSaleFilter,
  listSales,
  countSales,
  getSaleForOwner,
};
