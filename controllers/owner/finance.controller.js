const Voucher = require("../../services/owner/finance.service");
const prefixAdmin = require("../../config/system");
const facilities = require("../../services/owner/facility.service");
const paginationHelper = require("../../helpers/pagination");
module.exports.index = async (req, res) => {
  const userId = res.locals.user.id;
  const countVoucher = await Voucher.countVoucherByOwnerId(userId);
  const pagination = paginationHelper(
    { currentPage: 1, limitPage: 4 },
    req.query,
    countVoucher,
  );
  const voucher = await Voucher.getVoucherByOwnerId(userId, pagination);
  res.render("owner/pages/finance/index", {
    pageTitle: "Trang Khuyến mãi",
    activeMenu: "finance",
    voucher: voucher,
    pagination,
  });
};
module.exports.create = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  res.render("owner/pages/finance/create", {
    pageTitle: "Tạo Voucher",
    activeMenu: "finance",
    venues: venues,
    ownerId: userId,
  });
};
module.exports.createPost = async (req, res) => {
  await Voucher.createVoucher(req.body);
  res.redirect(`${prefixAdmin.prefixAdmin}/finance`);
};
module.exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    await Voucher.deleteVoucher(id);
    req.flash("success", "Bạn đã xoá voucher thành công");
    res.redirect(req.get("Referer"));
  } catch (error) {
    req.flash("success", "Bạn đã xoá voucher thất bại");
    res.redirect(req.get("Referer"));
  }
};
module.exports.edit = async (req, res) => {
  const id = req.params.id;
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  const voucher = await Voucher.findOneVOucherById(id);
  res.render("owner/pages/finance/edit", {
    pageTitle: "Trang Khuyến mãi",
    activeMenu: "finance",
    voucher: voucher,
    venues: venues,
  });
};
module.exports.editPatch = async (req, res) => {
  const id = req.params.id;
  await Voucher.updateOneVoucher(id, req.body);
  req.flash("success", "Sửa đổi voucher thành công");
  res.redirect(req.get("Referer"));
};
