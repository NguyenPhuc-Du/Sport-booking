const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const Booking = require("../../models/booking.model");
const Sale = require("../../models/sale.model");
const StockReceipt = require("../../models/stock-receipt.model");
const User = require("../../models/user.model");
const Voucher = require("../../models/finance.model");
const facilityService = require("./facility.service");
const cache = require("../../helpers/memory-cache");

const VOUCHER_SCOPE_LABEL = {
  court: "Tiền sân",
  drink: "Đồ uống",
  order: "Hoá đơn",
};

const CACHE_TTL = 7 * 60 * 1000; // 7 phút
const PAID_BOOKING = ["upcoming", "completed"];

function asObjectIds(ids) {
  return [...new Set((ids || []).map((id) => String(id || "")).filter((id) => mongoose.Types.ObjectId.isValid(id)))].map(
    (id) => new mongoose.Types.ObjectId(id),
  );
}

function facilityMatch(venueIds) {
  const objectIds = asObjectIds(venueIds);
  return { $in: [...objectIds, ...objectIds.map(String)] };
}

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")}đ`;
}

function parseDateInput(value, endOfDay = false) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (endOfDay) return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function defaultRange() {
  const now = new Date();
  const y = now.getFullYear();
  return {
    dateFrom: `${y}-01-01`,
    dateTo: now.toISOString().slice(0, 10),
    year: String(y),
  };
}

function resolvePeriod(query = {}) {
  const defaults = defaultRange();
  const periodType = ["date", "quarter", "year"].includes(query.periodType)
    ? query.periodType
    : "date";
  const year = String(query.year || defaults.year).replace(/\D/g, "").slice(0, 4) || defaults.year;
  const quarter = Math.min(4, Math.max(1, Number(query.quarter) || 1));
  let dateFrom = String(query.dateFrom || defaults.dateFrom);
  let dateTo = String(query.dateTo || defaults.dateTo);

  if (periodType === "year") {
    dateFrom = `${year}-01-01`;
    dateTo = `${year}-12-31`;
  } else if (periodType === "quarter") {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const lastDay = new Date(Date.UTC(Number(year), endMonth, 0)).getUTCDate();
    dateFrom = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    dateTo = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }

  return { periodType, year, quarter, dateFrom, dateTo };
}

function normalizeFilter(query = {}) {
  const period = resolvePeriod(query);
  const amountMin =
    query.amountMin === undefined || query.amountMin === "" ? "" : Number(query.amountMin);
  const amountMax =
    query.amountMax === undefined || query.amountMax === "" ? "" : Number(query.amountMax);
  return {
    venueId: String(query.venueId || ""),
    ...period,
    amountMin: Number.isFinite(amountMin) ? amountMin : "",
    amountMax: Number.isFinite(amountMax) ? amountMax : "",
    tab: ["overview", "customers", "products"].includes(query.tab) ? query.tab : "overview",
    run: String(query.run || "") === "1",
    expand: String(query.expand || "") === "1",
    voucherScope: "",
    q: "",
    selectedCode: "",
  };
}

function quarterOf(date) {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

function moneyCell(n) {
  return Number(n || 0);
}

async function ownerScope(ownerId, venueId) {
  const venues = await facilityService.getAllVenueByOwnerId(ownerId);
  const venueIds = asObjectIds(venues.map((v) => v._id));
  const selected =
    venueId && venueIds.some((id) => String(id) === String(venueId)) ? String(venueId) : "";
  const scoped = selected ? asObjectIds([selected]) : venueIds;
  return { venues, venueIds: scoped, selectedVenueId: selected };
}

function amountClause(filter) {
  const range = {};
  if (Number.isFinite(filter.amountMin)) range.$gte = filter.amountMin;
  if (Number.isFinite(filter.amountMax)) range.$lte = filter.amountMax;
  if (!Object.keys(range).length) return null;
  return { amount: range };
}

async function loadInvoices(venueIds, filter) {
  if (!venueIds.length) return [];

  const from = parseDateInput(filter.dateFrom, false);
  const to = parseDateInput(filter.dateTo, true);
  const amount = amountClause(filter);

  const bookingFilter = {
    facilityId: facilityMatch(venueIds),
    status: { $in: PAID_BOOKING },
  };
  if (from && to) {
    bookingFilter.date = {
      $gte: filter.dateFrom,
      $lte: filter.dateTo,
    };
  }
  if (amount) Object.assign(bookingFilter, amount);

  const saleFilter = {
    venueId: { $in: venueIds },
    status: "paid",
  };
  if (from && to) {
    saleFilter.paidAt = { $gte: from, $lte: to };
  }
  if (amount) Object.assign(saleFilter, amount);

  const [bookings, sales] = await Promise.all([
    Booking.find(bookingFilter)
      .populate("userId", "fullName phone role")
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean(),
    Sale.find(saleFilter).sort({ paidAt: -1 }).limit(500).lean(),
  ]);

  const voucherCodes = [
    ...new Set(
      bookings
        .flatMap((b) =>
          String(b.voucherCode || "")
            .split(",")
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean),
        ),
    ),
  ];
  const voucherDocs = voucherCodes.length
    ? await Voucher.find({ code: { $in: voucherCodes } })
        .select("code apply_scope name")
        .lean()
    : [];
  const voucherMap = new Map(
    voucherDocs.map((v) => [
      String(v.code).toUpperCase(),
      {
        code: v.code,
        scope: v.apply_scope || "court",
        scopeLabel: VOUCHER_SCOPE_LABEL[v.apply_scope || "court"] || v.apply_scope,
        name: v.name || "",
      },
    ]),
  );

  const bookingRows = bookings.map((b) => {
    const user = b.userId || {};
    const customerLabel =
      String(b.guestName || "").trim() ||
      String(user.fullName || "").trim() ||
      "Khách";
    const codes = String(b.voucherCode || "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    const vouchers = codes.map((code) => voucherMap.get(code) || {
      code,
      scope: "court",
      scopeLabel: "Tiền sân",
      name: "",
    });
    return {
      code: b.code,
      type: "booking",
      typeLabel: "Đặt sân",
      date: b.date,
      customer: customerLabel,
      phone: String(b.guestPhone || user.phone || "").trim(),
      venue: b.facilityName || "",
      amount: Number(b.amount || 0),
      amountText: formatMoney(b.amount),
      discount: Number(b.discount || 0),
      discountText: formatMoney(b.discount || 0),
      voucherCode: codes.join(", ") || "",
      vouchers,
      voucherScopes: [...new Set(vouchers.map((v) => v.scope))],
      staffId: "",
      staffName: "Hệ thống / App",
      lines: [
        {
          name: `${b.courtName || "Sân"} (${b.time || ""})`,
          qty: 1,
          price: Number(b.courtPrice || 0),
          lineTotal: Number(b.courtPrice || 0),
        },
        ...(b.drinks || []).map((d) => ({
          name: d.name,
          qty: Number(d.qty || 0),
          price: Number(d.price || 0),
          lineTotal: Number(d.price || 0) * Number(d.qty || 0),
          drinkId: d.drinkId ? String(d.drinkId) : "",
        })),
      ],
      paidAt: b.paidAt || b.createdAt,
    };
  });

  const saleRows = sales.map((s) => ({
    code: s.code,
    type: "sale",
    typeLabel: "Bán nước",
    date: s.paidAt ? s.paidAt.toISOString().slice(0, 10) : "",
    customer: s.guestName || "Khách",
    phone: s.guestPhone || "",
    venue: s.venueName || "",
    amount: Number(s.amount || 0),
    amountText: formatMoney(s.amount),
    discount: 0,
    discountText: formatMoney(0),
    voucherCode: "",
    vouchers: [],
    voucherScopes: [],
    staffId: s.createdBy ? String(s.createdBy) : "",
    staffName: "",
    lines: (s.items || []).map((item) => ({
      name: item.name,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      lineTotal: Number(item.lineTotal || 0),
      drinkId: item.drinkId ? String(item.drinkId) : "",
    })),
    paidAt: s.paidAt || s.createdAt,
  }));

  const staffIds = [...new Set(saleRows.map((r) => r.staffId).filter(Boolean))];
  const staffUsers = staffIds.length
    ? await User.find({ _id: { $in: staffIds } }).select("fullName email").lean()
    : [];
  const staffMap = new Map(staffUsers.map((u) => [String(u._id), u.fullName || u.email || "NV"]));
  saleRows.forEach((row) => {
    row.staffName = staffMap.get(row.staffId) || "Nhân viên";
  });

  let rows = [...bookingRows, ...saleRows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (filter.voucherScope === "none") {
    rows = rows.filter((row) => !row.vouchers.length);
  } else if (filter.voucherScope) {
    rows = rows.filter((row) => row.voucherScopes.includes(filter.voucherScope));
  }
  return rows;
}

async function loadExpense(venueIds, filter) {
  if (!venueIds.length) return 0;
  const from = parseDateInput(filter.dateFrom, false);
  const to = parseDateInput(filter.dateTo, true);
  const find = {
    venueId: { $in: venueIds },
    status: "received",
  };
  if (from && to) find.receivedAt = { $gte: from, $lte: to };
  const rows = await StockReceipt.find(find).select("amount receivedAt").lean();
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function buildQuarterMatrix(year, invoices, expensesByQuarter) {
  const revenue = { 1: 0, 2: 0, 3: 0, 4: 0 };
  invoices.forEach((inv) => {
    const d = inv.paidAt ? new Date(inv.paidAt) : parseDateInput(inv.date);
    if (!d || d.getUTCFullYear() !== Number(year)) return;
    revenue[quarterOf(d)] += Number(inv.amount || 0);
  });
  const expense = { 1: 0, 2: 0, 3: 0, 4: 0, ...expensesByQuarter };
  const thu = {
    label: "Tổng thu (hóa đơn)",
    q1: revenue[1],
    q2: revenue[2],
    q3: revenue[3],
    q4: revenue[4],
    total: revenue[1] + revenue[2] + revenue[3] + revenue[4],
  };
  const chi = {
    label: "Tổng chi (nhập hàng)",
    q1: expense[1],
    q2: expense[2],
    q3: expense[3],
    q4: expense[4],
    total: expense[1] + expense[2] + expense[3] + expense[4],
  };
  const profit = {
    label: "Lợi nhuận",
    q1: thu.q1 - chi.q1,
    q2: thu.q2 - chi.q2,
    q3: thu.q3 - chi.q3,
    q4: thu.q4 - chi.q4,
    total: thu.total - chi.total,
  };
  return { thu, chi, profit, year };
}

async function expensesByQuarter(venueIds, year) {
  const from = new Date(Date.UTC(Number(year), 0, 1));
  const to = new Date(Date.UTC(Number(year), 11, 31, 23, 59, 59, 999));
  const rows = await StockReceipt.find({
    venueId: { $in: venueIds },
    status: "received",
    receivedAt: { $gte: from, $lte: to },
  })
    .select("amount receivedAt")
    .lean();
  const map = { 1: 0, 2: 0, 3: 0, 4: 0 };
  rows.forEach((row) => {
    const d = new Date(row.receivedAt);
    map[quarterOf(d)] += Number(row.amount || 0);
  });
  return map;
}

function groupByStaff(invoices, years) {
  const yearList = years.length ? years : [new Date().getFullYear()];
  const map = new Map();
  invoices.forEach((inv) => {
    const d = inv.paidAt ? new Date(inv.paidAt) : parseDateInput(inv.date);
    if (!d) return;
    const y = d.getUTCFullYear();
    if (!yearList.includes(y)) return;
    const key = inv.staffId || inv.staffName || "unknown";
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: inv.staffName || "Nhân viên",
        years: Object.fromEntries(yearList.map((yy) => [yy, 0])),
        total: 0,
      });
    }
    const row = map.get(key);
    row.years[y] = (row.years[y] || 0) + Number(inv.amount || 0);
    row.total += Number(inv.amount || 0);
  });
  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const all = {
    id: "all",
    name: "TẤT CẢ",
    years: Object.fromEntries(yearList.map((yy) => [yy, 0])),
    total: 0,
  };
  rows.forEach((row) => {
    yearList.forEach((yy) => {
      all.years[yy] += row.years[yy] || 0;
    });
    all.total += row.total;
  });
  return { years: yearList, rows, all };
}

function groupByCustomer(invoices, years) {
  const yearList = years.length ? years : [new Date().getFullYear()];
  const map = new Map();
  invoices.forEach((inv) => {
    const d = inv.paidAt ? new Date(inv.paidAt) : parseDateInput(inv.date);
    if (!d) return;
    const y = d.getUTCFullYear();
    if (!yearList.includes(y)) return;
    const key = `${inv.customer}|${inv.phone}`.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: inv.customer || "Khách",
        phone: inv.phone || "",
        years: Object.fromEntries(yearList.map((yy) => [yy, 0])),
        total: 0,
      });
    }
    const row = map.get(key);
    row.years[y] = (row.years[y] || 0) + Number(inv.amount || 0);
    row.total += Number(inv.amount || 0);
  });
  const rows = [...map.values()].sort((a, b) => b.total - a.total).slice(0, 100);
  const all = {
    id: "all",
    name: "TẤT CẢ",
    phone: "",
    years: Object.fromEntries(yearList.map((yy) => [yy, 0])),
    total: 0,
  };
  rows.forEach((row) => {
    yearList.forEach((yy) => {
      all.years[yy] += row.years[yy] || 0;
    });
    all.total += row.total;
  });
  return { years: yearList, rows, all };
}

function groupByProduct(invoices, year) {
  const map = new Map();
  invoices.forEach((inv) => {
    const d = inv.paidAt ? new Date(inv.paidAt) : parseDateInput(inv.date);
    if (!d || d.getUTCFullYear() !== Number(year)) return;
    const q = quarterOf(d);
    (inv.lines || []).forEach((line) => {
      if (!line.drinkId && inv.type === "booking" && !String(line.name || "").includes("")) {
        // keep court lines out of SP table unless they are drinks
      }
      const isDrink = Boolean(line.drinkId) || inv.type === "sale";
      if (!isDrink && inv.type === "booking") return;
      const key = line.drinkId || line.name || "sp";
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: line.name || "Sản phẩm",
          q1: 0,
          q2: 0,
          q3: 0,
          q4: 0,
          total: 0,
        });
      }
      const row = map.get(key);
      const add = Number(line.lineTotal || 0);
      row[`q${q}`] += add;
      row.total += add;
    });
  });
  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const all = {
    id: "all",
    name: "Tất cả",
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    total: 0,
  };
  rows.forEach((row) => {
    all.q1 += row.q1;
    all.q2 += row.q2;
    all.q3 += row.q3;
    all.q4 += row.q4;
    all.total += row.total;
  });
  return { year: Number(year), rows, all };
}

function groupCustomersPeriod(invoices) {
  const map = new Map();
  invoices.forEach((inv) => {
    const key = `${inv.customer}|${inv.phone}`.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: inv.customer || "Khách",
        phone: inv.phone || "",
        total: 0,
      });
    }
    map.get(key).total += Number(inv.amount || 0);
  });
  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const all = {
    id: "all",
    name: "TẤT CẢ",
    phone: "",
    total: rows.reduce((sum, row) => sum + row.total, 0),
  };
  return { rows, all, totalCount: rows.length };
}

function groupProductsPeriod(invoices) {
  const map = new Map();
  invoices.forEach((inv) => {
    (inv.lines || []).forEach((line) => {
      const isDrink = Boolean(line.drinkId) || inv.type === "sale";
      if (!isDrink && inv.type === "booking") return;
      const key = line.drinkId || line.name || "sp";
      if (!map.has(key)) {
        map.set(key, { id: key, name: line.name || "Sản phẩm", total: 0 });
      }
      map.get(key).total += Number(line.lineTotal || 0);
    });
  });
  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const all = {
    id: "all",
    name: "Tất cả",
    total: rows.reduce((sum, row) => sum + row.total, 0),
  };
  return { rows, all, totalCount: rows.length };
}

async function buildReport(ownerId, query) {
  const filter = normalizeFilter(query);
  const { venues, venueIds, selectedVenueId } = await ownerScope(ownerId, filter.venueId);
  const base = {
    filter: { ...filter, venueId: selectedVenueId },
    venues: venues.map((v) => ({ _id: String(v._id), name: v.name })),
    hasResults: false,
    summary: {
      invoiceCount: 0,
      revenue: 0,
      revenueText: formatMoney(0),
      expense: 0,
      expenseText: formatMoney(0),
      profit: 0,
      profitText: formatMoney(0),
    },
    quarterMatrix: {
      year: Number(filter.year),
      thu: { label: "Tổng thu (hóa đơn)", q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
      chi: { label: "Tổng chi (nhập hàng)", q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
      profit: { label: "Lợi nhuận", q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
    },
    customerStats: { rows: [], all: { name: "TẤT CẢ", phone: "", total: 0 }, totalCount: 0 },
    productStats: { rows: [], all: { name: "Tất cả", total: 0 }, totalCount: 0 },
    periodLabel: `${filter.dateFrom} → ${filter.dateTo}`,
  };

  if (!filter.run) return base;

  const cacheKey = `owner:report:v2:${ownerId}:${JSON.stringify(filter)}`;
  return cache.remember(cacheKey, CACHE_TTL, async () => {
    const yearNum = Number(filter.year);
    const yearFilter = {
      ...filter,
      dateFrom: `${yearNum}-01-01`,
      dateTo: `${yearNum}-12-31`,
    };
    const [invoices, rangeExpense, quarterExpense, yearInvoices] = await Promise.all([
      loadInvoices(venueIds, filter),
      loadExpense(venueIds, filter),
      expensesByQuarter(venueIds, yearNum),
      loadInvoices(venueIds, yearFilter),
    ]);

    const rangeRevenue = invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return {
      ...base,
      hasResults: true,
      summary: {
        invoiceCount: invoices.length,
        revenue: rangeRevenue,
        revenueText: formatMoney(rangeRevenue),
        expense: rangeExpense,
        expenseText: formatMoney(rangeExpense),
        profit: rangeRevenue - rangeExpense,
        profitText: formatMoney(rangeRevenue - rangeExpense),
      },
      quarterMatrix: buildQuarterMatrix(yearNum, yearInvoices, quarterExpense),
      customerStats: groupCustomersPeriod(invoices),
      productStats:
        filter.periodType === "date"
          ? { ...groupProductsPeriod(invoices), showQuarters: false }
          : (() => {
              const byQuarter = groupByProduct(yearInvoices, yearNum);
              return {
                rows: byQuarter.rows,
                all: byQuarter.all,
                totalCount: byQuarter.rows.length,
                showQuarters: true,
                year: yearNum,
              };
            })(),
      periodLabel:
        filter.periodType === "year"
          ? `Năm ${filter.year}`
          : filter.periodType === "quarter"
            ? `Quý ${filter.quarter}/${filter.year}`
            : `${filter.dateFrom} → ${filter.dateTo}`,
    };
  });
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  });
}

async function exportExcel(ownerId, query) {
  const data = await buildReport(ownerId, { ...query, run: "1" });
  const wb = new ExcelJS.Workbook();
  wb.creator = "SportZone";
  wb.created = new Date();

  const overview = wb.addWorksheet("Tong hop");
  overview.addRow(["Kỳ", data.periodLabel]);
  overview.addRow(["Từ ngày", data.filter.dateFrom, "Đến ngày", data.filter.dateTo]);
  overview.addRow(["Tổng hóa đơn", data.summary.invoiceCount]);
  overview.addRow(["Tổng thu", data.summary.revenue]);
  overview.addRow(["Tổng chi", data.summary.expense]);
  overview.addRow(["Lợi nhuận", data.summary.profit]);
  overview.addRow([]);
  overview.addRow([`Năm ${data.quarterMatrix.year}`, "Q1", "Q2", "Q3", "Q4", "Tổng"]);
  styleHeader(overview.lastRow);
  [data.quarterMatrix.thu, data.quarterMatrix.chi, data.quarterMatrix.profit].forEach((row) => {
    overview.addRow([row.label, row.q1, row.q2, row.q3, row.q4, row.total]);
  });

  const custSheet = wb.addWorksheet("Theo KH");
  custSheet.addRow(["Khach hang", "SDT", "Tong"]);
  styleHeader(custSheet.lastRow);
  [...data.customerStats.rows, data.customerStats.all].forEach((row) => {
    custSheet.addRow([row.name, row.phone || "", row.total]);
  });

  const spSheet = wb.addWorksheet("Theo SP");
  if (data.productStats.showQuarters) {
    spSheet.addRow(["San pham", "Q1", "Q2", "Q3", "Q4", "TONG"]);
    styleHeader(spSheet.lastRow);
    [...data.productStats.rows, data.productStats.all].forEach((row) => {
      spSheet.addRow([row.name, row.q1 || 0, row.q2 || 0, row.q3 || 0, row.q4 || 0, row.total]);
    });
  } else {
    spSheet.addRow(["San pham", "Tong"]);
    styleHeader(spSheet.lastRow);
    [...data.productStats.rows, data.productStats.all].forEach((row) => {
      spSheet.addRow([row.name, row.total]);
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return {
    filename: `bao-cao-${data.filter.dateFrom}_${data.filter.dateTo}.xlsx`,
    buffer: Buffer.from(buffer),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

async function exportPdf(ownerId, query) {
  const data = await buildReport(ownerId, query);
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const done = new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text("Bao cao thong ke SportZone", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Tu ${data.filter.dateFrom} den ${data.filter.dateTo}`);
  doc.text(`Tong HD: ${data.summary.invoiceCount}`);
  doc.text(`Tong thu: ${data.summary.revenueText}`);
  doc.text(`Tong chi: ${data.summary.expenseText}`);
  doc.text(`Loi nhuan: ${data.summary.profitText}`);
  doc.moveDown();
  doc.fontSize(13).text(`Bang quy/nam ${data.quarterMatrix.year}`);
  doc.fontSize(10);
  [data.quarterMatrix.thu, data.quarterMatrix.chi, data.quarterMatrix.profit].forEach((row) => {
    doc.text(
      `${row.label}: Q1=${formatMoney(row.q1)} | Q2=${formatMoney(row.q2)} | Q3=${formatMoney(row.q3)} | Q4=${formatMoney(row.q4)} | Tong=${formatMoney(row.total)}`,
    );
  });
  doc.moveDown();
  doc.fontSize(13).text("Top san pham theo quy");
  doc.fontSize(10);
  data.productStats.rows.slice(0, 15).forEach((row) => {
    if (data.productStats.showQuarters) {
      doc.text(
        `${row.name}: Q1=${formatMoney(row.q1)} Q2=${formatMoney(row.q2)} Q3=${formatMoney(row.q3)} Q4=${formatMoney(row.q4)} Tong=${formatMoney(row.total)}`,
      );
    } else {
      doc.text(`${row.name}: Tong=${formatMoney(row.total)}`);
    }
  });
  doc.end();
  const buffer = await done;
  return {
    filename: `bao-cao-${data.filter.dateFrom}_${data.filter.dateTo}.pdf`,
    buffer,
    contentType: "application/pdf",
  };
}

module.exports = {
  buildReport,
  exportExcel,
  exportPdf,
  normalizeFilter,
  formatMoney,
  moneyCell,
};
