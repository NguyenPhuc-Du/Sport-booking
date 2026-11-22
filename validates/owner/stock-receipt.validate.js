const Drink = require("../../models/drink.model");
const Supplier = require("../../models/supplier.model");
const facilityService = require("../../services/owner/facility.service");
const systemConfig = require("../../config/system");

function back(req, res) {
  return res.redirect(
    req.get("Referrer") || `${systemConfig.prefixOwner}/drinks/receipts/create`,
  );
}

module.exports.createPost = async (req, res, next) => {
  const venues = await facilityService.getAllVenueByOwnerId(res.locals.user.id);
  const venue = venues.find((item) => String(item._id) === String(req.body.venueId || ""));
  if (!venue) {
    req.flash("error", "Vui lòng chọn cơ sở");
    return back(req, res);
  }

  if (!req.body.supplierId) {
    req.flash("error", "Vui lòng chọn nhà cung cấp");
    return back(req, res);
  }
  const supplier = await Supplier.findOne({
    _id: req.body.supplierId,
    ownerId: res.locals.user.id,
    status: "active",
  }).lean();
  if (!supplier) {
    req.flash("error", "Nhà cung cấp không còn dùng được");
    return back(req, res);
  }

  let posted = req.body.items || [];
  if (typeof posted === "string") {
    try {
      posted = JSON.parse(posted);
    } catch (error) {
      posted = [];
    }
  }
  if (!posted.length) {
    req.flash("error", "Chưa chọn sản phẩm nào");
    return back(req, res);
  }

  const rows = [];
  for (const row of posted) {
    const id = String(row.drinkId || row.id || "");
    const qty = Number(row.qty);
    const costPrice = Math.round(Number(row.costPrice));
    if (!id) {
      req.flash("error", "Sản phẩm không hợp lệ");
      return back(req, res);
    }
    if (!Number.isInteger(qty) || qty < 1) {
      req.flash("error", "Số lượng phải là số nguyên dương");
      return back(req, res);
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      req.flash("error", "Giá nhập không hợp lệ");
      return back(req, res);
    }

    const existed = rows.find((item) => item.id === id);
    if (existed) {
      existed.qty += qty;
      existed.costPrice = costPrice;
    } else {
      rows.push({ id, qty, costPrice });
    }
  }

  const products = await Drink.find({
    _id: { $in: rows.map((item) => item.id) },
    venueId: venue._id,
  }).lean();
  if (products.length !== rows.length) {
    req.flash("error", "Có sản phẩm không thuộc cơ sở này");
    return back(req, res);
  }

  const items = [];
  let amount = 0;
  for (const row of rows) {
    const product = products.find((item) => String(item._id) === row.id);
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

  req.body.venueId = venue._id;
  req.body.venueName = venue.name;
  req.body.supplierId = supplier._id;
  req.body.supplierName = supplier.name;
  req.body.items = items;
  req.body.amount = amount;
  req.body.note = req.body.note ? req.body.note.trim().slice(0, 200) : "";
  next();
};
