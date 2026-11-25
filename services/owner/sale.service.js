const Sale = require("../../models/sale.model");
const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");
const drinkService = require("./drink.service");
const searchHelper = require("../../helpers/search");
const { ganNgayVaTien, ganCoSo, lietKe, tongSoTien, timTheoCoSo } = require("../../helpers/loc-phieu");
  
module.exports.getSaleCatalog = async (ownerId) => {
  const { venues, drinks } = await drinkService.danhSachDaNho(ownerId);

  const catalog = drinks.map((item) => {
    return {
      id: String(item._id),
      name: item.name,
      price: Number(item.price) || 0,
      stock: Number(item.stock) || 0,
      image: item.image || "",
      venueId: drinkService.venueIdOf(item.venueId),
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
  } finally {
    drinkService.xoaBanNhoDoUong(ownerId);
  }
};

module.exports.buildSaleFilter = (query, venueIds) => {
  const find = {};

  const objectSearch = searchHelper(query);
  if (objectSearch.regex) {
    const digits = String(objectSearch.keyword).replace(/\D/g, "");
    find.$or = [
      { code: objectSearch.regex },
      { guestName: objectSearch.regex },
    ];
    if (digits) find.$or.push({ guestPhone: new RegExp(digits) });
  }

  const venueId = ganCoSo(find, "venueId", venueIds, query.venueId);
  const range = ganNgayVaTien(find, query, "paidAt");
  return {
    find,
    filter: {
      keyword: objectSearch.keyword,
      venueId,
      ...range,
    },
  };
};

module.exports.listSales = (find, pagination) => lietKe(Sale, find, pagination);
module.exports.listAllSales = (find) => lietKe(Sale, find);
module.exports.tongTheoLoc = (find) => tongSoTien(Sale, find, "soPhieu");

module.exports.findOwnedSale = async (ownerId, saleId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  return timTheoCoSo(Sale, saleId, venues.map((item) => item._id));
};
