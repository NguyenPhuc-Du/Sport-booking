const Sale = require("../../models/sale.model");
const Drink = require("../../models/drink.model");
const facilityService = require("./facility.service");
const drinkService = require("./drink.service");
const {
  listUsableVouchers,
  consumeVoucherUses,
  releaseVoucherUses,
} = require("./voucher-quay.service");
const searchHelper = require("../../helpers/search");
const { applyDateAndAmount, applyVenue, listDocs, sumAmount, findByVenue } = require("../../helpers/loc-phieu");
  
module.exports.getSaleCatalog = async (ownerId) => {
  const { venues, drinks } = await drinkService.listCachedDrinks(ownerId);
  const vouchers = await listUsableVouchers(venues.map((venue) => venue._id));
  return { venues, catalog: drinkService.toCatalog(drinks), vouchers };
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

    const voucherCodes = String(body.voucherCode || "")
      .split(",")
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);
    const consumed = await consumeVoucherUses(voucherCodes);
    try {
      return await Sale.create({
        code: `SLZ${Date.now()}`,
        venueId: body.venueId,
        venueName: body.venueName,
        guestName: body.guestName,
        guestPhone: body.guestPhone,
        items: body.items,
        subtotal: Number(body.subtotal) || Number(body.amount) || 0,
        discount: Number(body.discount) || 0,
        voucherCode: body.voucherCode || "",
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        status: "paid",
        paidAt: new Date(),
        createdBy: ownerId,
        note: body.note || "",
      });
    } catch (error) {
      await releaseVoucherUses(consumed);
      throw error;
    }
  } catch (error) {
    for (const item of decremented) {
      await Drink.updateOne({ _id: item.drinkId }, { $inc: { stock: item.qty } });
    }
    throw error;
  } finally {
    drinkService.clearDrinkCache(ownerId);
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

  const venueId = applyVenue(find, "venueId", venueIds, query.venueId);
  const range = applyDateAndAmount(find, query, "paidAt");
  return {
    find,
    filter: {
      keyword: objectSearch.keyword,
      venueId,
      ...range,
    },
  };
};

module.exports.listSales = (find, pagination) => listDocs(Sale, find, pagination);
module.exports.listAllSales = (find) => listDocs(Sale, find);
module.exports.totalsForFilter = (find) => sumAmount(Sale, find, "soPhieu");

module.exports.findOwnedSale = async (ownerId, saleId) => {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  return findByVenue(Sale, saleId, venues.map((item) => item._id));
};
