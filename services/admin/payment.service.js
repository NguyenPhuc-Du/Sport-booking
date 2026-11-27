const mongoose = require("mongoose");
const Ledger = require("../../models/ledger-entry.model");
const { phanTrang, ganLink } = require("../../helpers/phanTrang");
const { formatVnd } = require("./present");
const { motDieuKien, ghepHai } = require("./tim-nang-cao");

const TRUONG_THANH_TOAN = {
  amount: "so",
  created_at: "ngay",
  code: "chu",
  booking_code: "chu",
};

/**
 * Thoát ký tự đặc biệt của regex.
 * @param {string} value Chuỗi người dùng gõ.
 * @returns {string}
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function timQuery(query) {
  return {
    t1: query.t1 || "",
    o1: query.o1 || "",
    v1: query.v1 || "",
    t2: query.t2 || "",
    o2: query.o2 || "",
    v2: query.v2 || "",
    l2: query.l2 || "and",
  };
}

/**
 * Bộ lọc giao dịch thanh toán. Chỉ nhận chuỗi, không nhận object từ query.
 * @param {object} query q, from, to và hai điều kiện nâng cao.
 * @returns {object} Filter MongoDB.
 */
function filterOf(query) {
  const filter = { type: "payment" };
  if (mongoose.isValidObjectId(query.owner)) filter.owner_id = query.owner;
  const q = String(query.q || "").trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ code: regex }, { booking_code: regex }, { note: regex }];
  }
  if (query.from || query.to) {
    filter.created_at = {};
    if (query.from) filter.created_at.$gte = new Date(`${query.from}T00:00:00`);
    if (query.to) filter.created_at.$lte = new Date(`${query.to}T23:59:59`);
  }
  const tim = timQuery(query);
  const nang = ghepHai(
    motDieuKien(tim.t1, tim.o1, String(tim.v1).trim(), TRUONG_THANH_TOAN[tim.t1]),
    motDieuKien(tim.t2, tim.o2, String(tim.v2).trim(), TRUONG_THANH_TOAN[tim.t2]),
    tim.l2,
  );
  return nang ? { $and: [filter, nang] } : filter;
}

/**
 * Danh sách thanh toán và số liệu theo bộ lọc.
 * @param {object} query Trang, tìm kiếm, khoảng ngày.
 * @returns {Promise<object>}
 * Gọi từ trang Giao dịch thanh toán.
 */
async function danhSach(query) {
  const filter = filterOf(query);
  const tim = timQuery(query);
  const [data, summary] = await Promise.all([
    phanTrang({
      model: Ledger,
      filter,
      sort: { created_at: -1 },
      page: query.page,
      pageSize: query.pageSize,
      populate: { path: "user_id", select: "fullName" },
      select: "code booking_code amount effect note created_at user_id",
    }),
    Ledger.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);
  const row = summary[0] || { total: 0, count: 0 };
  return {
    items: data.items.map((item) => ({
      id: String(item._id),
      code: item.code,
      booking: item.booking_code || "—",
      account: item.user_id && item.user_id.fullName ? item.user_id.fullName : "—",
      amount: formatVnd(item.amount),
      note: item.note || "",
      when: item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "—",
    })),
    stats: [
      { nhan: "Số giao dịch", giaTri: String(row.count) },
      { nhan: "Tổng tiền", giaTri: formatVnd(row.total) },
    ],
    q: String(query.q || ""),
    from: query.from || "",
    to: query.to || "",
    ...tim,
    pagination: ganLink(data, "/admin/payments", {
      q: query.q || "",
      from: query.from || "",
      to: query.to || "",
      ...tim,
    }),
  };
}

/**
 * Một hóa đơn thanh toán để hiện ngay dưới danh sách.
 * @param {string} id Id dòng sổ cái.
 * @returns {Promise<object|null>}
 */
async function mot(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const item = await Ledger.findOne({ _id: id, type: "payment" })
    .populate("user_id", "fullName email phone")
    .lean();
  if (!item) return null;
  const khach = item.user_id || {};
  return {
    id: String(item._id),
    code: item.code,
    booking: item.booking_code || "—",
    account: khach.fullName || "—",
    email: khach.email || "—",
    phone: khach.phone || "—",
    amount: formatVnd(item.amount),
    note: item.note || "—",
    when: item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "—",
  };
}

module.exports = { danhSach, mot };
