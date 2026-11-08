const Drink = require("../../models/drink.model");
const facilityService = require("../../services/owner/facility.service");
const systemConfig = require("../../config/system");

function back(req, res) {
  return res.redirect(
    req.get("Referrer") || `${systemConfig.prefixOwner}/drinks/sales/create`,
  );
}

module.exports.createPost = async (req, res, next) => {
  const venues = await facilityService.getAllVenueByOwnerId(res.locals.user.id);
  const venue = venues.find((item) => String(item._id) === String(req.body.venueId || ""));
  if (!venue) {
    req.flash("error", "Vui lòng chọn cơ sở");
    return back(req, res);
  }

  const guestName = req.body.guestName ? req.body.guestName.trim() : "";
  if (!guestName) {
    req.flash("error", "Vui lòng nhập tên khách");
    return back(req, res);
  }

  const phone = String(req.body.guestPhone || "").replace(/\D/g, "");
  if (phone && !/^0\d{9}$/.test(phone)) {
    req.flash("error", "Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
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
    if (!id) {
      req.flash("error", "Sản phẩm không hợp lệ");
      return back(req, res);
    }
    if (!Number.isInteger(qty) || qty < 1) {
      req.flash("error", "Số lượng phải là số nguyên dương");
      return back(req, res);
    }

    const existed = rows.find((item) => item.id === id);
    if (existed) existed.qty += qty;
    else rows.push({ id, qty });
  }

  const products = await Drink.find({
    _id: { $in: rows.map((item) => item.id) },
    venueId: venue._id,
    status: "active",
  }).lean();
  if (products.length !== rows.length) {
    req.flash("error", "Có sản phẩm không thuộc cơ sở này hoặc đã ngừng bán");
    return back(req, res);
  }

  const items = [];
  let amount = 0;
  for (const row of rows) {
    const product = products.find((item) => String(item._id) === row.id);
    const stock = Number(product.stock) || 0;
    if (row.qty > stock) {
      req.flash("error", `${product.name} chỉ còn ${stock} sản phẩm`);
      return back(req, res);
    }

    const price = Number(product.price) || 0;
    amount += price * row.qty;
    items.push({
      drinkId: product._id,
      name: product.name,
      price,
      qty: row.qty,
      lineTotal: price * row.qty,
    });
  }

  req.body.venueId = venue._id;
  req.body.venueName = venue.name;
  req.body.guestName = guestName;
  req.body.guestPhone = phone;
  req.body.items = items;
  req.body.amount = amount;
  req.body.note = req.body.note ? req.body.note.trim().slice(0, 200) : "";
  req.body.paymentMethod = req.body.paymentMethod === "vnpay" ? "vnpay" : "cash";
  next();
};
