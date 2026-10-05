const Voucher = require("../../models/voucher.model");
module.exports.index = async (req, res) => {
  const voucher = await Voucher.find({}).lean();
  voucher.forEach((item) => {
    item.display_value = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(item.discount_value);
    item.display_minorder = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(item.min_order_amount);
  });
  console.log(voucher);
  res.render("admin/pages/voucher/index", {
    pageTitle: "Trang Khuyến mãi",
    voucher: voucher,
  });
};
