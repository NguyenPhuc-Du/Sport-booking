const path = require("path");
const PDFDocument = require("pdfkit");

const FONT = path.join(__dirname, "../public/fonts/NotoSans-Regular.ttf");
const XANH = "#047857";
const XANH_NEN = "#ecfdf5";
const MUC = "#0f172a";
const PHU = "#64748b";
const KEO = "#e2e8f0";
const NEN = "#f8fafc";

// Xuất đúng một phiếu đang mở. Không đụng danh sách.
function xuatPhieu(res, tenFile, phieu) {
  const doc = new PDFDocument({ size: "A5", margin: 28 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${tenFile}"`);
  doc.pipe(res);
  doc.font(FONT);

  const trai = doc.page.margins.left;
  const rong = doc.page.width - trai - doc.page.margins.right;

  veDau(doc, trai, rong, phieu.tieuDe);
  doc.y = 102;
  veThongTin(doc, trai, rong, phieu.thongTin || []);
  if (Array.isArray(phieu.mon)) veMon(doc, trai, rong, phieu.tieuDeMon || "Các món", phieu.mon);
  veTien(doc, trai, rong, phieu.phanTien || [], phieu.tongNhan, phieu.tong);
  veChan(doc, trai, rong);
  doc.end();
}

function veDau(doc, trai, rong, tieuDe) {
  doc.rect(0, 0, doc.page.width, 84).fill(XANH);
  doc.rect(0, 84, doc.page.width, 4).fill("#10b981");
  doc.fillColor("#ffffff").fontSize(9).text("SPORTZONE", trai, 22, {
    width: rong,
    align: "center",
    characterSpacing: 1.4,
  });
  doc.fontSize(18).text(tieuDe, trai, 42, { width: rong, align: "center" });
}

function veThongTin(doc, trai, rong, pairs) {
  doc.fontSize(10);
  pairs.forEach((pair, index) => {
    const nhan = String(pair[0] || "");
    const giaTri = String(pair[1] || "—");
    const cao = Math.max(
      doc.heightOfString(nhan, { width: 100 }),
      doc.heightOfString(giaTri, { width: rong - 118 }),
    );
    const y = doc.y;
    if (index % 2 === 0) doc.rect(trai - 6, y - 4, rong + 12, cao + 10).fill(NEN);
    doc.fillColor(PHU).text(nhan, trai, y, { width: 100 });
    doc.fillColor(MUC).text(giaTri, trai + 110, y, { width: rong - 110, align: "right" });
    doc.y = y + cao + 10;
  });
}

function veMon(doc, trai, rong, tieuDe, mon) {
  doc.y += 12;
  doc.fillColor(XANH).fontSize(12).text(tieuDe, trai, doc.y, { width: rong });
  doc.y += 6;
  const yKe = doc.y;
  doc.moveTo(trai, yKe).lineTo(trai + 42, yKe).lineWidth(2).strokeColor(XANH).stroke();
  doc.y = yKe + 10;

  const cotSl = 36;
  const cotTien = 88;
  const cotTen = rong - cotSl - cotTien;
  const dong = mon.length ? mon : [{ ten: "Không có món" }];

  const yDau = doc.y;
  doc.rect(trai, yDau, rong, 18).fill(XANH_NEN);
  doc.fillColor(XANH).fontSize(8);
  doc.text("MÓN", trai + 6, yDau + 5, { width: cotTen - 8, lineBreak: false });
  doc.text("SL", trai + cotTen, yDau + 5, { width: cotSl, align: "center", lineBreak: false });
  doc.text("THÀNH TIỀN", trai + cotTen + cotSl, yDau + 5, { width: cotTien - 6, align: "right", lineBreak: false });
  doc.y = yDau + 18;

  doc.fontSize(10);
  dong.forEach((line, index) => {
    const ten = typeof line === "string" ? line : line.ten || "—";
    const sl = typeof line === "string" ? "" : String(line.sl ?? "");
    const tienDong = typeof line === "string" ? "" : line.tien || "";
    const cao = Math.max(18, doc.heightOfString(ten, { width: cotTen - 12 }) + 8);
    const y = doc.y;
    if (index % 2 === 1) doc.rect(trai, y, rong, cao).fill(NEN);
    doc.fillColor(MUC).text(ten, trai + 6, y + 4, { width: cotTen - 12 });
    doc.text(sl, trai + cotTen, y + 4, { width: cotSl, align: "center" });
    doc.text(tienDong, trai + cotTen + cotSl, y + 4, { width: cotTien - 6, align: "right" });
    doc.y = y + cao;
  });
  doc.moveTo(trai, doc.y).lineTo(trai + rong, doc.y).lineWidth(0.6).strokeColor(KEO).stroke();
}

function veTien(doc, trai, rong, phan, tongNhan, tong) {
  const hop = 214;
  const x = trai + rong - hop;
  doc.y += 14;
  doc.fontSize(10);
  phan.forEach((pair) => {
    const y = doc.y;
    doc.fillColor(PHU).text(String(pair[0]), x, y, { width: 90 });
    doc.fillColor(MUC).text(String(pair[1] || "—"), x + 90, y, { width: hop - 90, align: "right" });
    doc.y = y + 16;
  });
  const y = doc.y + 4;
  doc.roundedRect(x, y, hop, 30, 6).fill(XANH);
  doc.fillColor("#ffffff").fontSize(11);
  doc.text(tongNhan || "Tổng", x + 12, y + 9, { width: 78 });
  doc.fontSize(12).text(String(tong || "—"), x + 90, y + 8, { width: hop - 102, align: "right" });
  doc.y = y + 38;
  doc.fillColor(MUC);
}

function veChan(doc, trai, rong) {
  // Chừa chỗ cho chiều cao dòng. Sát lề dưới thì pdfkit đẩy cả dòng sang trang mới.
  const y = doc.page.height - doc.page.margins.bottom - 22;
  if (doc.y > y) return;
  doc.fillColor(PHU).fontSize(8).text("SportZone  ·  Phiếu xuất từ hệ thống", trai, y, {
    width: rong,
    align: "center",
    lineBreak: false,
  });
}

function tien(n) {
  const s = Math.round(Number(n) || 0).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ";
}

function gio(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

module.exports = { xuatPhieu, tien, gio };
