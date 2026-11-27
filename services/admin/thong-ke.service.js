const ExcelJS = require("exceljs");
const path = require("path");
const PDFDocument = require("pdfkit");
const kho = require("./kho-du-lieu");
const { nho, lucNho } = require("./bo-nho");

const FONT = path.join(__dirname, "../../public/fonts/NotoSans-Regular.ttf");
const THONG_KE_MS = 2 * 60 * 1000;
const SO_NAM_SO_SANH = 3;
const PDF_TOI_DA_SAN = 18;
const PDF_TOI_DA_NGUOI = 12;
const BANG_HOP = ["khoang", "quy", "nguoi", "khach", "san"];

/**
 * Cách gom đang chọn trên form. Giá trị lạ thì xem theo quý.
 * @param {object} query
 * @returns {"thang"|"quy"|"nam"}
 */
function nhomCua(query) {
  return query.nhom === "thang" || query.nhom === "nam" ? query.nhom : "quy";
}

/**
 * Ba năm liên tiếp kết thúc bằng năm đang xem.
 * @param {number} nam
 * @returns {number[]}
 */
function baNam(nam) {
  return [nam - (SO_NAM_SO_SANH - 1), nam - 1, nam];
}

/**
 * Khoảng ngày và năm người dùng chọn. Ngày sai thì lấy cả năm đang xem.
 * @param {object} query from, to, nam.
 * @returns {{from: string, to: string, nam: number}}
 */
function chonKy(query) {
  const nam = Number(query.nam);
  const namNay = new Date().getFullYear();
  const namXem = Number.isInteger(nam) && nam >= 2020 && nam <= namNay + 1 ? nam : namNay;
  const macDau = `${namXem}-01-01`;
  const macCuoi = `${namXem}-12-31`;
  const hop = /^\d{4}-\d{2}-\d{2}$/;
  let from = hop.test(query.from || "") ? query.from : macDau;
  let to = hop.test(query.to || "") ? query.to : macCuoi;
  if (from > to) {
    const doi = from;
    from = to;
    to = doi;
  }
  return { from, to, nam: namXem };
}

function tien(so) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(so || 0))} ₫`;
}

function moc(ngay, cuoi) {
  return new Date(`${ngay}T${cuoi ? "23:59:59" : "00:00:00"}+07:00`);
}

/**
 * Bốn bảng thống kê từ sổ cái và đơn đặt sân.
 * @param {object} query from, to, nam.
 * @returns {Promise<object>} Số đã định dạng và số thô để xuất file.
 */
function baoCao(query, batBuoc) {
  const ky = chonKy(query);
  const key = `thongke:${ky.from}:${ky.to}:${ky.nam}`;
  return nho(key, THONG_KE_MS, () => tinh(ky), batBuoc).then((data) => ({
    ...data,
    luc: lucNho(key),
    nhom: nhomCua(query),
    bang: BANG_HOP.includes(query.bang) ? query.bang : "",
  }));
}

async function tinh(ky) {
  const { from, to, nam } = ky;
  const namDau = moc(`${nam - 2}-01-01`, false);
  const namCuoi = moc(`${nam}-12-31`, true);
  const [theoThang, theoNguoi, theoSan, khoangRaw] = await Promise.all([
    kho.theoThang(namDau, namCuoi),
    kho.theoNguoi(namDau, namCuoi),
    kho.theoSan(moc(`${nam}-01-01`, false), moc(`${nam}-12-31`, true)),
    kho.theoKhoang(moc(from, false), moc(to, true)),
  ]);

  const quy = bangQuy(theoThang, nam);
  const maxThu = Math.max(...quy.filter((row) => row.nhan !== "Tổng cộng").map((row) => row.thu), 1);
  quy.forEach((row) => {
    row.cao = row.thu ? Math.max(8, Math.round((row.thu / maxThu) * 72)) : 0;
  });
  const thang = bangThang(theoThang, nam);
  const cacNam = bangNam(theoThang, nam);
  const namCot = baNam(nam);
  const chuSan = await bangNguoi(theoNguoi, "owner", namCot);
  const khach = await bangNguoi(theoNguoi, "user", namCot);
  const san = bangSan(theoSan);
  const khoang = docKhoang(khoangRaw);

  return { from, to, nam, namCot, khoang, quy, thang, cacNam, chuSan, khach, san };
}

function cong(dong, loai, so) {
  if (loai === "payment") dong.thu += so;
  else dong.chi += so;
  dong.loi = dong.thu - dong.chi;
}

function dongTien(nhan, thu, chi) {
  return { nhan, thu, chi, loi: thu - chi, thuText: tien(thu), chiText: tien(chi), loiText: tien(thu - chi) };
}

/**
 * Thêm hàng Tổng cộng. Dùng chung cho bảng quý và bảng tháng.
 * @param {object[]} dong
 * @returns {object[]}
 */
function themTong(dong) {
  const thu = dong.reduce((s, item) => s + item.thu, 0);
  const chi = dong.reduce((s, item) => s + item.chi, 0);
  dong.push(dongTien("Tổng cộng", thu, chi));
  return dong;
}

function bangQuy(rows, nam) {
  const o = [0, 1, 2, 3].map((i) => ({ thu: 0, chi: 0, loi: 0 }));
  rows.forEach((row) => {
    if (row._id.y !== nam) return;
    cong(o[Math.ceil(row._id.m / 3) - 1], row._id.type, row.total);
  });
  const dong = o.map((item, i) => dongTien(`Quý ${i + 1}`, item.thu, item.chi));
  return themTong(dong);
}

function bangNam(rows, nam) {
  const o = new Map(baNam(nam).map((y) => [y, { thu: 0, chi: 0 }]));
  rows.forEach((row) => {
    const bucket = o.get(row._id.y);
    if (bucket) cong(bucket, row._id.type, row.total);
  });
  return [...o.entries()].map(([y, item]) => dongTien(String(y), item.thu, item.chi));
}

function docKhoang(rows) {
  let thu = 0;
  let chi = 0;
  let dem = 0;
  rows.forEach((row) => {
    if (row._id === "payment") {
      thu += row.total;
      dem += row.dem;
    } else chi += row.total;
  });
  return { ...dongTien("Khoảng đã chọn", thu, chi), dem };
}

async function bangNguoi(rows, khoa, namCot) {
  const map = new Map();
  rows.forEach((row) => {
    const id = String(row._id[khoa] || "");
    const cot = namCot.indexOf(row._id.y);
    if (!id || cot < 0) return;
    if (!map.has(id)) map.set(id, { ten: "—", so: namCot.map(() => 0) });
    map.get(id).so[cot] += row.total;
  });
  const ids = [...map.keys()];
  const users = ids.length ? await kho.timNguoi(ids) : [];
  const ten = new Map(users.map((item) => [String(item._id), item]));
  const dong = [...map.entries()]
    .map(([id, item]) => {
      const tong = item.so.reduce((s, n) => s + n, 0);
      const ho = ten.get(id);
      return {
        id,
        ten: ho ? ho.fullName : "—",
        phu: ho ? ho.email : id,
        so: item.so,
        tong,
        soText: item.so.map(tien),
        tongText: tien(tong),
      };
    })
    .sort((a, b) => b.tong - a.tong)
    .slice(0, 40);
  const tongSo = namCot.map((_, i) => dong.reduce((s, item) => s + item.so[i], 0));
  const tong = tongSo.reduce((s, n) => s + n, 0);
  return {
    namCot,
    dong,
    tong: { ten: "Tổng cộng", so: tongSo, tong, soText: tongSo.map(tien), tongText: tien(tong) },
  };
}

function bangSan(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const id = String(row._id.id || row._id.ten || "khong-ro");
    if (!map.has(id)) map.set(id, { ten: row._id.ten || "Chưa rõ sân", so: [0, 0, 0, 0] });
    map.get(id).so[Math.ceil(row._id.m / 3) - 1] += row.total;
  });
  const dong = [...map.entries()]
    .map(([id, item]) => {
      const tong = item.so.reduce((s, n) => s + n, 0);
      return { id, ten: item.ten, so: item.so, tong, soText: item.so.map(tien), tongText: tien(tong) };
    })
    .sort((a, b) => b.tong - a.tong);
  const tongSo = [0, 1, 2, 3].map((i) => dong.reduce((s, item) => s + item.so[i], 0));
  const tong = tongSo.reduce((s, n) => s + n, 0);
  return {
    dong,
    tong: { ten: "Tổng cộng", so: tongSo, tong, soText: tongSo.map(tien), tongText: tien(tong) },
  };
}

function bangThang(rows, nam) {
  const o = Array.from({ length: 12 }, () => ({ thu: 0, chi: 0 }));
  rows.forEach((row) => {
    if (row._id.y !== nam) return;
    cong(o[row._id.m - 1], row._id.type, row.total);
  });
  const dong = o.map((item, i) => dongTien(`Tháng ${i + 1}`, item.thu, item.chi));
  return themTong(dong);
}

/**
 * Ghi bốn bảng ra một file Excel.
 * @param {object} res Response.
 * @param {object} data Kết quả baoCao.
 * @returns {Promise<void>}
 */
async function xuatExcel(res, data) {
  const wb = new ExcelJS.Workbook();
  const chon = data.bang || "";
  const giu = (ma) => !chon || chon === ma;
  if (giu("khoang")) {
    const khoang = wb.addWorksheet("Khoang ngay");
    khoang.addRow(["Từ", data.from, "Đến", data.to]);
    khoang.addRow(["Tổng thu", data.khoang.thu]);
    khoang.addRow(["Tổng chi", data.khoang.chi]);
    khoang.addRow(["Lợi nhuận", data.khoang.loi]);
  }
  if (giu("quy")) {
    const quy = wb.addWorksheet("Quy");
    quy.addRow(["Kỳ", "Tổng thu", "Tổng chi", "Lợi nhuận"]);
    data.quy.forEach((row) => quy.addRow([row.nhan, row.thu, row.chi, row.loi]));
    data.thang.forEach((row) => quy.addRow([row.nhan, row.thu, row.chi, row.loi]));
    data.cacNam.forEach((row) => quy.addRow([`Năm ${row.nhan}`, row.thu, row.chi, row.loi]));
  }
  if (giu("nguoi")) themNguoi(wb.addWorksheet("Chu san"), data.chuSan);
  if (giu("khach")) themNguoi(wb.addWorksheet("Khach hang"), data.khach);
  if (giu("san")) {
    const san = wb.addWorksheet("San");
    san.addRow(["Mã sân", "Sân", "Quý 1", "Quý 2", "Quý 3", "Quý 4", "Tổng"]);
    data.san.dong.forEach((row) => san.addRow([row.id, row.ten, ...row.so, row.tong]));
    san.addRow(["", data.san.tong.ten, ...data.san.tong.so, data.san.tong.tong]);
  }
  wb.worksheets.forEach((sheet) => {
    sheet.getRow(1).font = { bold: true };
  });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="thong-ke.xlsx"');
  await wb.xlsx.write(res);
  if (!res.writableEnded) res.end();
}

function themNguoi(sheet, bang) {
  sheet.addRow(["Mã", "Tên", "Email", ...bang.namCot.map((nam) => `Năm ${nam}`), "Tổng"]);
  bang.dong.forEach((row) => sheet.addRow([row.id || "", row.ten, row.phu || "", ...row.so, row.tong]));
  sheet.addRow(["", bang.tong.ten, "", ...bang.tong.so, bang.tong.tong]);
}

/**
 * Xuất báo cáo PDF. Dùng font tiếng Việt có sẵn trong dự án.
 * @param {object} res Response.
 * @param {object} data Kết quả baoCao.
 */
function xuatPdf(res, data) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'inline; filename="thong-ke.pdf"');
  doc.pipe(res);
  doc.font(FONT);
  doc.fontSize(16).fillColor("#047857").text("Báo cáo thống kê kinh doanh");
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#0f172a").text(`Kỳ ${data.from} đến ${data.to}. Năm xem ${data.nam}.`);
  doc.text(`Người xuất: ${data.nguoi || "Quản trị"}. Lúc: ${data.luc ? new Date(data.luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}.`);
  doc.moveDown(0.4);
  doc.text("Thu là tiền khách thanh toán. Chi là hoàn tiền và rút tiền. Lợi nhuận = thu − chi.");
  doc.moveDown(0.6);
  doc.fontSize(12).text(`Tổng thu ${data.khoang.thuText}    Tổng chi ${data.khoang.chiText}    Lợi nhuận ${data.khoang.loiText}`);
  doc.moveDown(0.8);
  doc.fontSize(12).text(`Theo quý năm ${data.nam}`);
  veBang(doc, ["Kỳ", "Tổng thu", "Tổng chi", "Lợi nhuận"], data.quy.map((row) => [row.nhan, row.thuText, row.chiText, row.loiText]));
  doc.moveDown(0.6);
  doc.fontSize(12).text("Theo sân và quý");
  const dongSan = data.san.dong.slice(0, PDF_TOI_DA_SAN).map((row) => [row.ten, ...row.soText, row.tongText]);
  dongSan.push([data.san.tong.ten, ...data.san.tong.soText, data.san.tong.tongText]);
  veBang(doc, ["Sân", "Quý 1", "Quý 2", "Quý 3", "Quý 4", "Tổng"], dongSan);
  doc.moveDown(0.6);
  doc.fontSize(12).text("So sánh năm");
  veBang(doc, ["Năm", "Tổng thu", "Tổng chi", "Lợi nhuận"], data.cacNam.map((row) => [row.nhan, row.thuText, row.chiText, row.loiText]));
  doc.moveDown(0.6);
  doc.fontSize(12).text("Theo chủ sân và năm");
  veBang(
    doc,
    ["Chủ sân", ...data.chuSan.namCot.map(String), "Tổng"],
    data.chuSan.dong.slice(0, PDF_TOI_DA_NGUOI).map((row) => [row.ten, ...row.soText, row.tongText]).concat([[data.chuSan.tong.ten, ...data.chuSan.tong.soText, data.chuSan.tong.tongText]]),
  );
  doc.moveDown(0.6);
  doc.fontSize(12).text("Theo khách hàng và năm");
  veBang(
    doc,
    ["Khách hàng", ...data.khach.namCot.map(String), "Tổng"],
    data.khach.dong.slice(0, PDF_TOI_DA_NGUOI).map((row) => [row.ten, ...row.soText, row.tongText]).concat([[data.khach.tong.ten, ...data.khach.tong.soText, data.khach.tong.tongText]]),
  );
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(i);
    doc.font(FONT).fontSize(8).fillColor("#64748b").text(`Trang ${i + 1}/${range.count}`, 36, doc.page.height - 24, { align: "right", width: doc.page.width - 72 });
  }
  doc.end();
}

function veBang(doc, cot, dong) {
  const trai = doc.page.margins.left;
  const rong = (doc.page.width - trai - doc.page.margins.right) / cot.length;
  let y = doc.y + 6;
  const veHang = (cells, dam) => {
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    cells.forEach((cell, i) => {
      doc.fontSize(8).fillColor("#0f172a").text(String(cell), trai + i * rong, y, {
        width: rong - 6,
        height: 14,
        ellipsis: true,
      });
    });
    if (dam) doc.moveTo(trai, y + 14).lineTo(trai + rong * cot.length, y + 14).stroke("#e2e8f0");
    y += 16;
  };
  veHang(cot, true);
  dong.forEach((row) => veHang(row, false));
  doc.y = y + 4;
}

module.exports = { baoCao, xuatExcel, xuatPdf, chonKy, nhomCua };
