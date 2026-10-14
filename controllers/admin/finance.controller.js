const Voucher = require("../../models/finance.model");
const prefixAdmin = require("../../config/system");
module.exports.index = async (req, res) => {
  const voucher = await Voucher.find({ deleted: false }).lean();
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
  console.log(voucher);
  res.render("admin/pages/finance/index", {
    pageTitle: "Trang Khuyến mãi",
    voucher: voucher,
  });
};
module.exports.create = async (req, res) => {
  res.render("admin/pages/finance/create", {
    pageTitle: "Tạo Voucher",
  });
};
module.exports.createPost = async (req, res) => {
  req.body.discount_value = parseInt(req.body.discount_value);
  req.body.max_discount = parseInt(req.body.max_discount);
  req.body.min_order_amount = parseInt(req.body.min_order_amount);
  req.body.quantity = parseInt(req.body.quantity);
  req.body.start_date = new Date(req.body.start_date);
  req.body.end_date = new Date(req.body.end_date); // Lấy giá trị end_
  const voucher = new Voucher(req.body);
  await voucher.save();
  res.redirect(`${prefixAdmin.prefixAdmin}/finance`);
};
module.exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    await Voucher.updateOne({ _id: id }, { deleted: true });
    req.flash("success", "Bạn đã xoá voucher thành công");
    res.redirect(req.get("Referer"));
  } catch (error) {
    req.flash("success", "Bạn đã xoá voucher thất bại");
    res.redirect(req.get("Referer"));
  }
};
module.exports.edit = async (req, res) => {
  const id = req.params.id;
  const voucher = await Voucher.findOne({ _id: id }).lean();
  const formatDateTimeLocal = (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toISOString().slice(0, 16);
  };
  voucher.start_date_formatted = formatDateTimeLocal(voucher.start_date);
  voucher.end_date_formatted = formatDateTimeLocal(voucher.end_date);
  res.render("admin/pages/finance/edit", {
    pageTitle: "Trang Khuyến mãi",
    voucher: voucher,
  });
};
module.exports.editPatch = async (req, res) => {
  req.body.discount_value = parseInt(req.body.discount_value);
  req.body.max_discount = parseInt(req.body.max_discount);
  req.body.min_order_amount = parseInt(req.body.min_order_amount);
  req.body.quantity = parseInt(req.body.quantity);
  req.body.start_date = new Date(req.body.start_date);
  req.body.end_date = new Date(req.body.end_date); // Lấy giá trị end_
  const id = req.params.id;
  await Voucher.updateOne({ _id: id }, req.body);
  req.flash("success", "Sửa đổi voucher thành công");
  res.redirect(req.get("Referer"));
};
