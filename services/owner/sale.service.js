const Sale = require("../../models/sale.model");
const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");
const searchHelper = require("../../helpers/search");

module.exports.getSaleCatalog = async (ownerId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);
  const drinks = await Drink.find({ venueId: { $in: venueIds } })
    .select("name price stock image venueId status")
    .lean();

  const catalog = drinks.map((item) => {
    return {
      id: String(item._id),
      name: item.name,
      price: Number(item.price) || 0,
      stock: Number(item.stock) || 0,
      image: item.image || "",
      venueId: String(item.venueId),
      status: item.status,
    };
  });

  return { venues, catalog };
};

module.exports.createWalkInSale = async (ownerId, body) => {
  const decremented = [];
  try {
    for (const item of body.items) {
      const updated = await Drink.findOneAndUpdate(
        { _id: item.drinkId, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } },
        { new: true },
      );
      if (!updated) throw new Error(`${item.name} không đủ tồn kho`);
      decremented.push(item);
    }

    return await Sale.create({
      code: `SLZ${Date.now()}`,
      venueId: body.venueId,
      venueName: body.venueName,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      items: body.items,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      status: "paid",
      paidAt: new Date(),
      createdBy: ownerId,
      note: body.note || "",
    });
  } catch (error) {
    for (const item of decremented) {
      await Drink.updateOne({ _id: item.drinkId }, { $inc: { stock: item.qty } });
    }
    throw error;
  }
};

module.exports.buildSaleFilter = (query, venueIds) => {
  const find = {};

  // Xử lý tìm kiếm theo mã phiếu, tên khách, số điện thoại
  const objectSearch = searchHelper(query);
  if (objectSearch.regex) {
    const digits = String(objectSearch.keyword).replace(/\D/g, "");
    find.$or = [
      { code: objectSearch.regex },
      { guestName: objectSearch.regex },
    ];
    if (digits) find.$or.push({ guestPhone: new RegExp(digits) });
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

module.exports.listSales = async (find, pagination) => {
  return await Sale.find(find)
    .sort({ createdAt: -1 })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();
};

module.exports.countSales = async (find) => {
  return await Sale.countDocuments(find);
};

module.exports.getSaleForOwner = async (ownerId, saleId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);
  return await Sale.findOne({
    _id: saleId,
    venueId: { $in: venueIds },
  }).lean();
};
