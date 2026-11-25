const Ledger = require("../../models/ledger-entry.model");
const { phanTrang, ganLink } = require("../../helpers/phanTrang");
const { formatVnd } = require("./present");

/**
 * Thoát ký tự đặc biệt của regex.
 * @param {string} value Chuỗi người dùng gõ.
 * @returns {string}
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bộ lọc giao dịch thanh toán. Chỉ nhận chuỗi, không nhận object từ query.
 * @param {object} query q, from, to.
 * @returns {object} Filter MongoDB.
 */
function filterOf(query) {
  const filter = { type: "payment" };
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
  return filter;
}

/**
 * Danh sách thanh toán và số liệu theo bộ lọc.
 * @param {object} query Trang, tìm kiếm, khoảng ngày.
 * @returns {Promise<object>}
 * Gọi từ trang Giao dịch thanh toán.
 */
async function danhSach(query) {
  const filter = filterOf(query);
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
    pagination: ganLink(data, "/admin/payments", {
      q: query.q || "",
      from: query.from || "",
      to: query.to || "",
    }),
  };
}

module.exports = { danhSach };
