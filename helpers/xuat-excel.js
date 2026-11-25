const ExcelJS = require("exceljs");

// Tải một file Excel. `cot` là tiêu đề cột, `dong` là các dòng đã lọc.
async function taiExcel(res, tenFile, cot, dong) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Du lieu");
  sheet.columns = cot;
  dong.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${tenFile}"`);
  await workbook.xlsx.write(res);
  if (!res.writableEnded) res.end();
}

module.exports = { taiExcel };
