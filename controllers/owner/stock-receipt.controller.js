const venueService = require("../../services/owner/facility.service");
const receiptService = require("../../services/owner/stock-receipt.service");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");
const { taiExcel } = require("../../helpers/xuat-excel");
const { xuatPhieu, tien, gio } = require("../../helpers/xuat-pdf");

function receiptsPath(suffix = "") {
  return `${systemConfig.prefixOwner}/drinks/receipts${suffix}`;
}

async function loadReceiptFilter(req, res) {
  const venues = await venueService.getAllVenueByOwnerId(res.locals.user.id);
  const venueIds = venues.map((item) => item._id);
  const { find, filter } = receiptService.buildReceiptFilter(req.query, venueIds);
  return { venues, find, filter };
}

function receiptExportRow(bill) {
  const at = bill.receivedAt || bill.createdAt;
  return {
    code: bill.code || "",
    time: gio(at),
    supplier: bill.supplierName || "",
    venue: bill.venueName || "",
    status: bill.status === "cancelled" ? "Đã hủy" : "Đã nhập",
    amount: Number(bill.amount) || 0,
    items: (bill.items || []).map((line) => `${line.name} x${line.qty}`).join(", "),
  };
}

module.exports.index = async (req, res) => {
  const { venues, find, filter } = await loadReceiptFilter(req, res);
  const tong = await receiptService.totalsForFilter(find);
  const pagination = paginationHelper({ limitPage: 10 }, req.query, tong.soPhieu);
  const receipts = tong.soPhieu ? await receiptService.listReceipts(find, pagination) : [];

  res.render("owner/pages/drinks/receipts", {
    pageTitle: "Phiếu nhập kho",
    activeMenu: "drinks",
    receipts,
    venues,
    filter,
    pagination,
    tongTien: tong.tongTien,
    soPhieu: tong.soPhieu,
  });
};

module.exports.exportReceipts = async (req, res) => {
  const { find } = await loadReceiptFilter(req, res);
  const receipts = await receiptService.listAllReceipts(find);
  await taiExcel(res, "phieu-nhap.xlsx", [
    { header: "Mã phiếu", key: "code", width: 22 },
    { header: "Thời gian", key: "time", width: 22 },
    { header: "Nhà cung cấp", key: "supplier", width: 24 },
    { header: "Cơ sở", key: "venue", width: 24 },
    { header: "Trạng thái", key: "status", width: 14 },
    { header: "Tổng tiền", key: "amount", width: 14 },
    { header: "Món", key: "items", width: 40 },
  ], receipts.map(receiptExportRow));
};

module.exports.receiptPdf = async (req, res) => {
  const bill = await receiptService.findOwnedReceipt(res.locals.user.id, req.params.id);
  if (!bill) return res.status(404).type("text/plain").send("Không thấy phiếu nhập");
  const row = receiptExportRow(bill);
  xuatPhieu(res, `${bill.code}.pdf`, {
    tieuDe: "Phiếu nhập nước",
    thongTin: [
      ["Mã phiếu", row.code],
      ["Thời gian", row.time],
      ["Nhà cung cấp", row.supplier],
      ["Cơ sở", row.venue],
      ["Trạng thái", row.status],
    ],
    mon: (bill.items || []).map((line) => ({
      ten: line.name,
      sl: line.qty,
      tien: tien(line.lineTotal),
    })),
    tongNhan: "Tổng chi",
    tong: tien(bill.amount),
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
    return res.redirect(receiptsPath());
  } catch (error) {
    req.flash("error", error.message || "Nhập kho thất bại");
    return res.redirect(receiptsPath("/create"));
  }
};

module.exports.cancel = async (req, res) => {
  try {
    const receipt = await receiptService.cancelReceipt(res.locals.user.id, req.params.id);
    req.flash("success", `Đã hủy phiếu ${receipt.code} và trừ lại tồn kho`);
    return res.redirect(receiptsPath());
  } catch (error) {
    req.flash("error", error.message || "Hủy phiếu nhập thất bại");
    return res.redirect(receiptsPath());
  }
};
