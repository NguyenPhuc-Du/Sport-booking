const Voucher = require("../../models/voucher.model");
module.exports.index = async (req, res) => {
  const voucher = await Voucher.find({});
  console.log(voucher);
  res.render("admin/pages/voucher/index", {
    pageTitle: "Trang Khuyến mãi",
    voucher: voucher,
  });
};
