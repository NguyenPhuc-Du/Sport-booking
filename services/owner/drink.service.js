const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");
const { nho, xoa } = require("../../helpers/nho-chu-san");

function xoaBanNhoDoUong(ownerId) {
  xoa(ownerId ? `owner:drinks:${ownerId}` : "owner:drinks:");
}

function venueIdOf(value) {
  return String(value && value._id ? value._id : value || "");
}

function danhSachDaNho(ownerId) {
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
  xoaBanNhoDoUong(ownerId);
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
  xoaBanNhoDoUong(ownerId);
  return updated;
};

module.exports.updateDrinkStatus = async (ownerId, drinkId, status) => {
  const updated = await Drink.updateOne({ _id: drinkId }, { status });
  xoaBanNhoDoUong(ownerId);
  return updated;
};

module.exports.calculateDrinkStats = (drinks) => {
  return {
    total: drinks.length,
    active: drinks.filter((item) => item.status === "active").length,
    inactive: drinks.filter((item) => item.status === "inactive").length,
    lowStock: drinks.filter((item) => Number(item.stock) <= 10).length,
    stockValue: drinks.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.stock) || 0);
    }, 0),
  };
};

module.exports.danhSachDaNho = danhSachDaNho;
module.exports.xoaBanNhoDoUong = xoaBanNhoDoUong;
module.exports.venueIdOf = venueIdOf;
