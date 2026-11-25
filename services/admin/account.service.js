const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Venue = require("../../models/facilities.model");
const Booking = require("../../models/booking.model");
const Ledger = require("../../models/ledger-entry.model");
const UserRole = require("../../models/user-role.model");
const { ServiceError } = require("./auth.service");
const { huyCache, nho } = require("./bo-nho");
const { nhanVaiTro } = require("../../helpers/nhan-trang-thai");

const LOAI = {
  owners: { role: "OWNER", title: "Chủ sân" },
  customers: { role: "USER", title: "Khách hàng" },
};

/**
 * Đổi đoạn URL thành vai trò được phép.
 * @param {string} loai owners hoặc customers.
 * @returns {{role: string, title: string}}
 */
function loaiNao(loai) {
  const found = LOAI[loai];
  if (!found) throw new ServiceError("Không có nhóm tài khoản này");
  return found;
}

/**
 * Đếm tổng, đang hoạt động, đã khóa và mới trong tháng.
 * @param {string} role OWNER hoặc USER.
 * @returns {Promise<object[]>}
 */
async function thongKe(role) {
  return nho(`thongke:${role}`, 20000, async () => {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    const [rows, monthNew] = await Promise.all([
      User.aggregate([
        { $match: { role, deleted_at: null } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
      User.countDocuments({ role, deleted_at: null, createdAt: { $gte: month } }),
    ]);
    const by = new Map(rows.map((row) => [row._id, row.n]));
    const active = by.get("active") || 0;
    const locked = by.get("inactive") || 0;
    return [
      { nhan: "Tổng", giaTri: String(active + locked) },
      { nhan: "Hoạt động", giaTri: String(active) },
      { nhan: "Đã khóa", giaTri: String(locked) },
      { nhan: "Mới tháng này", giaTri: String(monthNew) },
    ];
  });
}

/**
 * Hồ sơ một chủ sân hoặc khách, kèm sân hoặc lịch đặt.
 * @param {string} loai owners hoặc customers.
 * @param {string} id Id user.
 * @returns {Promise<object>}
 */
async function chiTiet(loai, id) {
  const meta = loaiNao(loai);
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ServiceError("Định danh không hợp lệ");
  const user = await User.findOne({ _id: id, role: meta.role, deleted_at: null })
    .select("-password_hash")
    .lean();
  if (!user) throw new ServiceError("Không có tài khoản này");
  if (meta.role === "OWNER") {
    const [venues, money] = await Promise.all([
      Venue.find({ owner_id: user._id }).select("name address city").lean(),
      Ledger.aggregate([
        { $match: { owner_id: user._id, type: { $in: ["payment", "commission"] } } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
    ]);
    return { user, meta, venues, money, bookings: [] };
  }
  const bookings = await Booking.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("code facilityName date time amount status")
    .lean();
  return { user, meta, venues: [], money: [], bookings };
}

/**
 * Ẩn tài khoản nếu đã có đơn hoặc dòng tiền. Xóa hẳn nếu chưa có gì.
 * @param {string} actorId Người thao tác.
 * @param {string} loai owners hoặc customers.
 * @param {string} id Id user.
 * @returns {Promise<string>} Câu thông báo.
 */
async function xoa(actorId, loai, id) {
  const data = await chiTiet(loai, id);
  if (String(actorId) === String(data.user._id)) throw new ServiceError("Không thể xóa chính mình");
  const [bookings, lines] = await Promise.all([
    Booking.countDocuments({ userId: data.user._id }),
    Ledger.countDocuments({ $or: [{ user_id: data.user._id }, { owner_id: data.user._id }] }),
  ]);
  if (bookings || lines || data.venues.length) {
    await User.updateOne(
      { _id: data.user._id },
      { $set: { deleted_at: new Date(), status: "inactive" }, $inc: { token_version: 1 } },
    );
    huyCache();
    return `${data.user.fullName} đã có dữ liệu liên quan nên chỉ được ẩn, không xóa hẳn`;
  }
  await UserRole.deleteOne({ user_id: data.user._id });
  await User.deleteOne({ _id: data.user._id });
  huyCache();
  return `Đã xóa ${data.user.fullName}`;
}

module.exports = { loaiNao, thongKe, chiTiet, xoa, nhanVaiTro };
