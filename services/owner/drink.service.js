const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");
const { nho, xoa } = require("../../helpers/nho-chu-san");

function clearDrinkCache(ownerId) {
  xoa(ownerId ? `owner:drinks:${ownerId}` : "owner:drinks:");
}

function venueIdOf(value) {
  return String(value && value._id ? value._id : value || "");
}

function toCatalog(drinks, withCostPrice = false) {
  return drinks.map((item) => ({
    id: String(item._id),
    name: item.name,
    price: Number(item.price) || 0,
    ...(withCostPrice ? { costPrice: Number(item.costPrice) || 0 } : {}),
    stock: Number(item.stock) || 0,
    image: item.image || "",
    venueId: venueIdOf(item.venueId),
    status: item.status,
  }));
}

function listCachedDrinks(ownerId) {
  return nho(`owner:drinks:${ownerId}`, async () => {
    const venues = await facilityService.getAllVenueByOwnerId(ownerId);
    const venueIds = venues.map((item) => item._id);
    const drinks = await Drink.find({ venueId: { $in: venueIds } })
      .populate("venueId", "name")
      .lean();
    return { venues, drinks };
  });
}

module.exports.createDrink = async (ownerId, data) => {
  const created = await Drink.create({
    name: data.name,
    venueId: data.venueId,
    image: data.image,
    price: Number(data.price),
    costPrice: Number(data.price) || 0,
    stock: 0,
    supplier: "",
    status: data.status === "inactive" ? "inactive" : "active",
  });
  clearDrinkCache(ownerId);
  return created;
};

module.exports.getDrinkWithVenueById = async (id) => {
  return await Drink.findOne({
    _id: id,
  }).populate("venueId", "name");
};

module.exports.updateDrink = async (ownerId, drinkId, data) => {
  const { name, venueId, price, status, image } = data;
  const update = {
    name,
    venueId,
    price: Number(price),
    status,
  };
  if (image) update.image = image;

  const updated = await Drink.updateOne({ _id: drinkId }, update);
  clearDrinkCache(ownerId);
  return updated;
};

module.exports.updateDrinkStatus = async (ownerId, drinkId, status) => {
  const updated = await Drink.updateOne({ _id: drinkId }, { status });
  clearDrinkCache(ownerId);
  return updated;
};

module.exports.calculateDrinkStats = (drinks) => {
  const stats = { total: drinks.length, active: 0, inactive: 0, lowStock: 0, stockValue: 0 };
  for (const item of drinks) {
    if (item.status === "active") stats.active += 1;
    if (item.status === "inactive") stats.inactive += 1;
    if (Number(item.stock) <= 10) stats.lowStock += 1;
    stats.stockValue += (Number(item.price) || 0) * (Number(item.stock) || 0);
  }
  return stats;
};

module.exports.listCachedDrinks = listCachedDrinks;
module.exports.clearDrinkCache = clearDrinkCache;
module.exports.venueIdOf = venueIdOf;
module.exports.toCatalog = toCatalog;
