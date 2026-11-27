const Ledger = require("../../models/ledger-entry.model");
const Booking = require("../../models/booking.model");
const User = require("../../models/user.model");

const TZ = "Asia/Ho_Chi_Minh";
const LOAI_THU_CHI = ["payment", "refund", "withdrawal"];

/**
 * Tổng thu, chi theo tháng trong một khoảng.
 * @param {Date} tu Mốc đầu.
 * @param {Date} den Mốc cuối.
 * @returns {Promise<object[]>}
 */
function theoThang(tu, den) {
  return Ledger.aggregate([
    {
      $match: {
        type: { $in: LOAI_THU_CHI },
        created_at: { $gte: tu, $lte: den },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: { date: "$created_at", timezone: TZ } },
          m: { $month: { date: "$created_at", timezone: TZ } },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);
}

/**
 * Tiền thanh toán theo chủ sân, khách và năm.
 * @param {Date} tu Mốc đầu.
 * @param {Date} den Mốc cuối.
 * @returns {Promise<object[]>}
 */
function theoNguoi(tu, den) {
  return Ledger.aggregate([
    { $match: { type: "payment", created_at: { $gte: tu, $lte: den } } },
    {
      $group: {
        _id: {
          owner: "$owner_id",
          user: "$user_id",
          y: { $year: { date: "$created_at", timezone: TZ } },
        },
        total: { $sum: "$amount" },
      },
    },
  ]);
}

/**
 * Tiền đơn đặt theo mã sân và tháng. Gom theo facilityId, không gom theo tên.
 * @param {Date} tu Đầu năm.
 * @param {Date} den Cuối năm.
 * @returns {Promise<object[]>}
 */
function theoSan(tu, den) {
  return Booking.aggregate([
    { $match: { status: { $in: ["upcoming", "completed"] }, createdAt: { $gte: tu, $lte: den } } },
    {
      $group: {
        _id: {
          id: "$facilityId",
          ten: { $ifNull: ["$facilityName", "Chưa rõ sân"] },
          m: { $month: { date: "$createdAt", timezone: TZ } },
        },
        total: { $sum: "$amount" },
      },
    },
  ]);
}

/**
 * Tổng theo loại giao dịch trong khoảng ngày người chọn.
 * @param {Date} tu Đầu khoảng.
 * @param {Date} den Cuối khoảng.
 * @returns {Promise<object[]>}
 */
function theoKhoang(tu, den) {
  return Ledger.aggregate([
    {
      $match: {
        type: { $in: LOAI_THU_CHI },
        created_at: { $gte: tu, $lte: den },
      },
    },
    { $group: { _id: "$type", total: { $sum: "$amount" }, dem: { $sum: 1 } } },
  ]);
}

/**
 * Tên và email của một danh sách id. Dùng để hiện người, không để gom số.
 * @param {string[]} ids Id user.
 * @returns {Promise<object[]>}
 */
function timNguoi(ids) {
  return User.find({ _id: { $in: ids } }).select("fullName email").lean();
}

module.exports = { theoThang, theoNguoi, theoSan, theoKhoang, timNguoi };
