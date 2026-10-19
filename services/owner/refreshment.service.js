const Refreshment = require("../../models/refreshment.model");
const searchHelper = require("../../helpers/search");

module.exports.createAnRefreshment = async (data) => {
  return await Refreshment.create(data);
};

module.exports.getRefreshmentWithVenueById = async (id) => {
  return await Refreshment.findOne({
    _id: id,
  }).populate("venueId", "name");
};

module.exports.updateRefreshment = async (refreshId, data) => {
  const { name, venueId, price, stock, supplier, status, image } = data;

  return await Refreshment.updateOne(
    {
      _id: refreshId,
    },
    {
      name,
      venueId,
      price: Number(price),
      stock: Number(stock),
      supplier,
      status,
      image,
    },
  );
};

module.exports.updateRefreshmentStatus = async (refreshId, status) => {
  return await Refreshment.updateOne({ _id: refreshId }, { status });
};

module.exports.getRefreshments = async (find) => {
  return await Refreshment.find(find).populate("venueId", "name");
};

module.exports.calculateRefreshmentStats = (refreshments) => {
  return {
    total: refreshments.length,
    active: refreshments.filter((item) => item.status === "active").length,
    inactive: refreshments.filter((item) => item.status === "inactive").length,
    lowStock: refreshments.filter((item) => Number(item.stock) <= 10).length,
    stockValue: refreshments.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.stock) || 0);
    }, 0),
  };
};

module.exports.buildRefreshmentFilterQuery = (query, venueIds) => {
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
