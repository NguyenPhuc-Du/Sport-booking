const venueService = require("../../services/owner/facility.service");
const receiptService = require("../../services/owner/stock-receipt.service");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");

function receiptsPath(suffix = "") {
  return `${systemConfig.prefixOwner}/drinks/receipts${suffix}`;
}

module.exports.index = async (req, res) => {
  const ownerId = res.locals.user.id;
  const venues = await venueService.getAllVenueByOwnerId(ownerId);
  const venueIds = venues.map((item) => item._id);
  const find = receiptService.buildReceiptFilter(req.query, venueIds);
  const count = await receiptService.countReceipts(find);
  const pagination = paginationHelper({ limitPage: 10 }, req.query, count);
  const receipts = await receiptService.listReceipts(find, pagination);

  res.render("owner/pages/drinks/receipts", {
    pageTitle: "Phiếu nhập kho",
    activeMenu: "drinks",
    receipts,
    venues,
    filter: req.query,
    pagination,
  });
};

module.exports.create = async (req, res) => {
  const { venues, catalog, suppliers } = await receiptService.getReceiptForm(res.locals.user.id);
  res.render("owner/pages/drinks/create-receipt", {
    pageTitle: "Tạo phiếu nhập kho",
    activeMenu: "drinks",
    venues,
    catalog,
    suppliers,
    prefillId: /^[a-f\d]{24}$/i.test(String(req.query.drinkId || ""))
      ? String(req.query.drinkId)
      : "",
  });
};

module.exports.createPost = async (req, res) => {
  try {
    const receipt = await receiptService.createReceipt(res.locals.user.id, req.body);
    req.flash("success", `Đã nhập kho phiếu ${receipt.code}`);
    return res.redirect(receiptsPath(`/${receipt._id}`));
  } catch (error) {
    req.flash("error", error.message || "Nhập kho thất bại");
    return res.redirect(receiptsPath("/create"));
  }
};

module.exports.detail = async (req, res) => {
  const receipt = await receiptService.getReceiptForOwner(res.locals.user.id, req.params.id);
  if (!receipt) {
    req.flash("error", "Không tìm thấy phiếu nhập");
    return res.redirect(receiptsPath());
  }

  res.render("owner/pages/drinks/receipt-detail", {
    pageTitle: `Phiếu ${receipt.code}`,
    activeMenu: "drinks",
    receipt,
  });
};

module.exports.cancel = async (req, res) => {
  try {
    const receipt = await receiptService.cancelReceipt(res.locals.user.id, req.params.id);
    req.flash("success", `Đã hủy phiếu ${receipt.code} và trừ lại tồn kho`);
    return res.redirect(receiptsPath(`/${receipt._id}`));
  } catch (error) {
    req.flash("error", error.message || "Hủy phiếu nhập thất bại");
    return res.redirect(receiptsPath(`/${req.params.id}`));
  }
};
