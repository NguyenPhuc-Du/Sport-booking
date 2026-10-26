const Drink = require("../../models/drink.model");
const searchHelper = require("../../helpers/search");

module.exports.createDrink = async (data) => {
  return await Drink.create({
    name: data.name,
    venueId: data.venueId,
    image: data.image,
    price: Number(data.price),
    costPrice: Number(data.price) || 0,
    stock: 0,
    supplier: "",
    status: data.status === "inactive" ? "inactive" : "active",
  });
};

module.exports.getDrinkWithVenueById = async (id) => {
  return await Drink.findOne({
    _id: id,
  }).populate("venueId", "name");
};

module.exports.updateDrink = async (drinkId, data) => {
  const { name, venueId, price, status, image } = data;
  const update = {
    name,
    venueId,
    price: Number(price),
    status,
  };
  if (image) update.image = image;

  return await Drink.updateOne({ _id: drinkId }, update);
};

module.exports.updateDrinkStatus = async (drinkId, status) => {
  return await Drink.updateOne({ _id: drinkId }, { status });
};

module.exports.getDrinks = async (find) => {
  return await Drink.find(find).populate("venueId", "name");
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

module.exports.buildDrinkFilterQuery = (query, venueIds) => {
  let find = {};

  // Xử lý tìm kiếm theo tên
  const objectSearch = searchHelper(query);
  if (objectSearch.regex) {
    find.name = objectSearch.regex;
  }

  // Xử lý trạng thái hoặc tồn kho thấp
  const status = query.status;
  if (status === "low") {
    find.stock = { $lte: 10 };
  } else if (status === "active" || status === "inactive") {
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
