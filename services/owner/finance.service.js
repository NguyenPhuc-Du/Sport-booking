const Voucher = require("../../models/finance.model");
const prefixAdmin = require("../../config/system");
module.exports.getVoucherByOwnerId = async (id) => {
  console.log(id);
  const voucher = await Voucher.find({ deleted: false, owner_id: id }).lean();
  voucher.forEach((item) => {
    item.display_value = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(item.discount_value);
    item.display_minorder = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(item.min_order_amount);
    item.percentUsed = (item.used_count / item.quantity) * 100;
    item.start_date = new Date(item.start_date).toISOString().split("T")[0];
    item.end_date = new Date(item.end_date).toISOString().split("T")[0];
  });
  return voucher;
};
module.exports.createVoucher = async (body) => {
  body.discount_value = parseInt(body.discount_value);
  body.max_discount = parseInt(body.max_discount);
  body.min_order_amount = parseInt(body.min_order_amount);
  body.quantity = parseInt(body.quantity);
  body.start_date = new Date(body.start_date);
  body.end_date = new Date(body.end_date); // Lấy giá trị end_
  const voucher = new Voucher(body);
  await voucher.save();
};
module.exports.deleteVoucher = async (id) => {
  await Voucher.updateOne({ _id: id }, { deleted: true });
};
module.exports.findOneVOucherById = async (id, userId) => {
  const voucher = await Voucher.findOne({ _id: id }).lean();
  const formatDateTimeLocal = (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toISOString().slice(0, 16);
  };
  voucher.start_date_formatted = formatDateTimeLocal(voucher.start_date);
  voucher.end_date_formatted = formatDateTimeLocal(voucher.end_date);
  return voucher;
};
module.exports.deleteVoucher = async (id) => {
  await Voucher.updateOne({ _id: id }, { deleted: true });
};
module.exports.updateOneVoucher = async (id, body) => {
  body.discount_value = parseInt(body.discount_value);
  body.max_discount = parseInt(body.max_discount);
  body.min_order_amount = parseInt(body.min_order_amount);
  body.quantity = parseInt(body.quantity);
  body.start_date = new Date(body.start_date);
  body.end_date = new Date(body.end_date); // Lấy giá trị end_

  await Voucher.updateOne({ _id: id }, body);
};
