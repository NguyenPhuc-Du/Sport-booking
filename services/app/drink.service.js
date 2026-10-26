const mongoose = require("mongoose");
const Drink = require("../../models/drink.model");
const Booking = require("../../models/booking.model");

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const MAX_QTY = 20;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function importPrice(item) {
  const cost = Number(item.costPrice);
  if (Number.isFinite(cost) && cost > 0) return cost;
  return Number(item.price) || 0;
}

function sellPrice(item) {
  return Math.floor((importPrice(item) * 130) / 100);
}

function publicDrink(item) {
  return {
    id: String(item._id),
    name: item.name,
    image: item.image || "",
    price: sellPrice(item),
    stock: item.stock,
  };
}

async function listForVenue(venueId) {
  if (!OBJECT_ID.test(String(venueId || ""))) return [];
  const items = await Drink.find({
    venueId,
    status: "active",
    stock: { $gt: 0 },
  })
    .sort({ name: 1 })
    .lean();
  return items.map(publicDrink);
}

async function snapshotDrinks(venueId, rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const lines = [];
  const seen = new Set();

  for (const item of items) {
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw httpError(400, "Số lượng nước không hợp lệ");
    }
    if (qty > MAX_QTY) {
      throw httpError(400, `Mỗi món tối đa ${MAX_QTY} sản phẩm`);
    }

    const id = item.drinkId || item.id;
    if (!OBJECT_ID.test(String(id || ""))) {
      throw httpError(400, "Món nước không hợp lệ");
    }
    if (seen.has(String(id))) {
      throw httpError(400, "Mỗi món chỉ được chọn một lần");
    }
    seen.add(String(id));

    const drink = await Drink.findOne({
      _id: id,
      venueId,
      status: "active",
    }).lean();
    if (!drink) throw httpError(404, "Không tìm thấy món nước của cơ sở này");
    if (drink.stock < qty) {
      throw httpError(409, `${drink.name} chỉ còn ${drink.stock} sản phẩm`);
    }

    lines.push({
      drinkId: drink._id,
      name: drink.name,
      price: sellPrice(drink),
      qty,
    });
  }

  const drinkTotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  return { drinks: lines, drinkTotal };
}

async function decrementStock(drinks) {
  const taken = [];
  for (const line of drinks || []) {
    const updated = await Drink.findOneAndUpdate(
      { _id: line.drinkId, stock: { $gte: line.qty } },
      { $inc: { stock: -line.qty } },
      { returnDocument: "after" },
    );
    if (!updated) {
      await restoreStock(taken);
      throw httpError(409, `${line.name} vừa hết hàng`);
    }
    taken.push(line);
  }
}

async function restoreStock(drinks) {
  for (const line of drinks || []) {
    if (!line.drinkId || !line.qty) continue;
    await Drink.updateOne(
      { _id: line.drinkId },
      { $inc: { stock: line.qty } },
    );
  }
}

async function releaseDrinks(bookingId) {
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, stockReleased: { $ne: true } },
    { $set: { stockReleased: true } },
    { returnDocument: "before" },
  );
  if (!booking) return;
  await restoreStock(booking.drinks);
}

module.exports = {
  listForVenue,
  snapshotDrinks,
  decrementStock,
  restoreStock,
  releaseDrinks,
};
