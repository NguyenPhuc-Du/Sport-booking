const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Venue = require("../../models/facilities.model");
const Court = require("../../models/court.model");
const Booking = require("../../models/booking.model");
const Ledger = require("../../models/ledger-entry.model");
const UserRole = require("../../models/user-role.model");
const { ServiceError } = require("./auth.service");
const { huyCache, nho, PHIEN_MS } = require("./bo-nho");
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
  return nho(`thongke:${role}`, PHIEN_MS, async () => {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    const truoc = new Date(month);
    truoc.setMonth(truoc.getMonth() - 1);
    const [rows, monthNew, thangTruoc] = await Promise.all([
      User.aggregate([
        { $match: { role, deleted_at: null } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
      User.countDocuments({ role, deleted_at: null, createdAt: { $gte: month } }),
      User.countDocuments({ role, deleted_at: null, createdAt: { $gte: truoc, $lt: month } }),
    ]);
    const by = new Map(rows.map((row) => [row._id, row.n]));
    const active = by.get("active") || 0;
    const locked = by.get("inactive") || 0;
    const tong = active + locked;
    const tyLe = (so) => (tong ? `${Math.round((so / tong) * 100)}% tổng số` : "Chưa có tài khoản");
    const lech = monthNew - thangTruoc;
    const phuThang = lech === 0 ? "Bằng tháng trước" : `${lech > 0 ? "+" : ""}${lech} so với tháng trước`;
    return [
      { nhan: "Tổng", giaTri: String(tong), phu: "Toàn bộ tài khoản", icon: "bi-people", loc: "" },
      { nhan: "Hoạt động", giaTri: String(active), phu: tyLe(active), icon: "bi-check-circle", loc: "active" },
      { nhan: "Đã khóa", giaTri: String(locked), phu: tyLe(locked), icon: "bi-lock", loc: "inactive" },
      { nhan: "Mới tháng này", giaTri: String(monthNew), phu: phuThang, icon: "bi-calendar-plus", loc: "thang" },
    ];
  });
}

const NHAN_GIAO_DICH = {
  payment: "Doanh thu",
  commission: "Hoa hồng sàn",
  refund: "Hoàn tiền",
  withdrawal: "Rút tiền",
  adjustment: "Điều chỉnh",
};

const NHAN_DAT = {
  pending_payment: "Chờ thanh toán",
  upcoming: "Sắp diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

/**
 * Đổi số tiền sang dạng 800.000 ₫.
 * @param {number} value Số gốc từ sổ cái.
 * @returns {string}
 */
function dinhDangTien(value) {
  const so = Math.round(Number(value) || 0);
  return `${new Intl.NumberFormat("vi-VN").format(so)} ₫`;
}

/**
 * Đổi ngày thành giờ Việt Nam và câu tương đối.
 * @param {Date|string} value Mốc thời gian.
 * @returns {{chu: string, tuongDoi: string}|null}
 */
function dinhDangLuc(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const lay = (type) => parts.find((part) => part.type === type).value;
  const giay = (Date.now() - date.getTime()) / 1000;
  let tuongDoi = "Vừa xong";
  if (giay >= 60 && giay < 3600) tuongDoi = `${Math.floor(giay / 60)} phút trước`;
  else if (giay >= 3600 && giay < 86400) tuongDoi = `${Math.floor(giay / 3600)} giờ trước`;
  else if (giay >= 86400 && giay < 86400 * 7) tuongDoi = `${Math.floor(giay / 86400)} ngày trước`;
  else if (giay >= 86400 * 7 && giay < 86400 * 30) tuongDoi = `${Math.floor(giay / 86400 / 7)} tuần trước`;
  else if (giay >= 86400 * 30 && giay < 86400 * 365) tuongDoi = `${Math.floor(giay / 86400 / 30)} tháng trước`;
  else if (giay >= 86400 * 365) tuongDoi = `${Math.floor(giay / 86400 / 365)} năm trước`;
  return {
    chu: `${lay("hour")}:${lay("minute")}, ${lay("day")}/${lay("month")}/${lay("year")}`,
    tuongDoi,
  };
}

/**
 * So sánh kỳ này với kỳ trước. Không có kỳ trước thì không bịa phần trăm.
 * @param {number} nay Tổng kỳ đang xem.
 * @param {number} truoc Tổng kỳ liền trước.
 * @returns {{len: boolean, chu: string}|null}
 */
function soVoiKyTruoc(nay, truoc) {
  if (!truoc) return null;
  const phanTram = Math.round(((nay - truoc) / truoc) * 100);
  const dau = phanTram > 0 ? "+" : "";
  return { len: phanTram >= 0, chu: `${dau}${phanTram}% so với kỳ trước` };
}

/**
 * Chọn 7 ngày, 30 ngày hoặc 12 tháng. Giá trị lạ về 30 ngày.
 * @param {string} raw Tham số ky trên URL.
 * @returns {number}
 */
function chonKy(raw) {
  if (String(raw) === "7") return 7;
  if (String(raw) === "365") return 365;
  return 30;
}

/**
 * Gom doanh thu, hoa hồng, sân và lượt đặt của một chủ sân.
 * @param {object} user Tài khoản chủ sân.
 * @param {object} query ky và san trên URL.
 * @returns {Promise<object>}
 */
async function hoSoChuSan(user, query) {
  const ky = chonKy(query.ky);
  const homNay = new Date();
  homNay.setHours(23, 59, 59, 999);
  const dauKy = new Date(homNay);
  dauKy.setDate(dauKy.getDate() - (ky === 365 ? 364 : ky - 1));
  dauKy.setHours(0, 0, 0, 0);
  const dauKyTruoc = new Date(dauKy);
  dauKyTruoc.setDate(dauKyTruoc.getDate() - (ky === 365 ? 365 : ky));

  const venues = await Venue.find({ owner_id: user._id, deleted: { $ne: true } })
    .select("name address city district status")
    .sort({ name: 1 })
    .lean();
  const ids = venues.map((san) => san._id);
  const coSan = ids.length > 0;

  const [loaiSan, luotDat, dongTien, giaoDich] = await Promise.all([
    coSan
      ? Court.aggregate([
          { $match: { venue_id: { $in: ids }, deleted: { $ne: true } } },
          {
            $lookup: {
              from: "court_types",
              localField: "court_type_id",
              foreignField: "_id",
              as: "loai",
            },
          },
          {
            $group: {
              _id: "$venue_id",
              loai: { $addToSet: { $arrayElemAt: ["$loai.name", 0] } },
            },
          },
        ])
      : [],
    coSan
      ? Booking.aggregate([
          { $match: { facilityId: { $in: ids }, createdAt: { $gte: dauKyTruoc } } },
          {
            $group: {
              _id: {
                san: "$facilityId",
                ky: { $cond: [{ $gte: ["$createdAt", dauKy] }, "nay", "truoc"] },
              },
              n: { $sum: 1 },
            },
          },
        ])
      : [],
    Ledger.aggregate([
      {
        $match: {
          owner_id: user._id,
          type: { $in: ["payment", "commission"] },
          created_at: { $gte: dauKyTruoc, $lte: homNay },
        },
      },
      {
        $group: {
          _id: {
            type: "$type",
            ky: { $cond: [{ $gte: ["$created_at", dauKy] }, "nay", "truoc"] },
            moc: {
              $dateToString: {
                format: ky === 365 ? "%Y-%m" : "%Y-%m-%d",
                date: "$created_at",
                timezone: "Asia/Ho_Chi_Minh",
              },
            },
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
    Ledger.find({ owner_id: user._id })
      .sort({ created_at: -1 })
      .limit(8)
      .select("type amount booking_code note created_at")
      .lean(),
  ]);

  const loaiTheoSan = new Map(loaiSan.map((row) => [String(row._id), row.loai.filter(Boolean)]));
  const datTheoSan = new Map();
  let datNay = 0;
  let datTruoc = 0;
  luotDat.forEach((row) => {
    if (row._id.ky === "nay") {
      datNay += row.n;
      datTheoSan.set(String(row._id.san), (datTheoSan.get(String(row._id.san)) || 0) + row.n);
    } else datTruoc += row.n;
  });

  const tong = { payment: 0, commission: 0, paymentTruoc: 0, commissionTruoc: 0 };
  const theoMoc = new Map();
  dongTien.forEach((row) => {
    const laNay = row._id.ky === "nay";
    if (row._id.type === "payment") tong[laNay ? "payment" : "paymentTruoc"] += row.total;
    if (row._id.type === "commission") tong[laNay ? "commission" : "commissionTruoc"] += row.total;
    if (!laNay) return;
    const o = theoMoc.get(row._id.moc) || { payment: 0, commission: 0 };
    o[row._id.type] = row.total;
    theoMoc.set(row._id.moc, o);
  });

  const cot = [];
  const buoc = ky === 365 ? 12 : ky;
  for (let i = buoc - 1; i >= 0; i -= 1) {
    const moc = new Date(homNay);
    if (ky === 365) moc.setMonth(moc.getMonth() - i, 1);
    else moc.setDate(moc.getDate() - i);
    const key = ky === 365
      ? `${moc.getFullYear()}-${String(moc.getMonth() + 1).padStart(2, "0")}`
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(moc);
    const o = theoMoc.get(key) || { payment: 0, commission: 0 };
    cot.push({
      nhan: ky === 365 ? `T${moc.getMonth() + 1}` : `${moc.getDate()}/${moc.getMonth() + 1}`,
      hienNhan: ky !== 30 || i % 5 === 0,
      doanhThu: o.payment,
      hoaHong: o.commission,
    });
  }
  const tran = Math.max(...cot.map((o) => Math.max(o.doanhThu, o.hoaHong)), 0);
  cot.forEach((o) => {
    o.caoDt = tran && o.doanhThu ? Math.max(4, Math.round((o.doanhThu / tran) * 100)) : 0;
    o.caoHh = tran && o.hoaHong ? Math.max(4, Math.round((o.hoaHong / tran) * 100)) : 0;
    o.tienDt = dinhDangTien(o.doanhThu);
    o.tienHh = dinhDangTien(o.hoaHong);
  });

  const san = venues.map((item) => ({
    _id: item._id,
    name: item.name,
    diaChi: [item.address, item.district, item.city].filter(Boolean).join(", "),
    loai: (loaiTheoSan.get(String(item._id)) || []).join(", ") || "Chưa phân loại",
    trangThai: item.status === "inactive" ? "Tạm ngưng" : "Đang mở",
    mo: item.status !== "inactive",
    luot: datTheoSan.get(String(item._id)) || 0,
  }));

  let sanDangXem = null;
  const sanId = String(query.san || "");
  const chon = san.find((item) => String(item._id) === sanId);
  if (chon) {
    const [courts, don] = await Promise.all([
      Court.find({ venue_id: chon._id, deleted: { $ne: true } })
        .select("name status surface")
        .populate({ path: "court_type_id", select: "name" })
        .lean(),
      Booking.find({ facilityId: chon._id })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("code courtName date time amount status")
        .lean(),
    ]);
    sanDangXem = {
      ...chon,
      courts: courts.map((court) => ({
        name: court.name,
        loai: court.court_type_id && court.court_type_id.name ? court.court_type_id.name : "Chưa phân loại",
        mat: court.surface || "",
        trangThai: court.status === "maintenance" ? "Bảo trì" : court.status === "inactive" ? "Tạm ngưng" : "Đang mở",
      })),
      don: don.map((item) => ({
        code: item.code,
        courtName: item.courtName,
        luc: `${item.date} ${item.time}`,
        tien: dinhDangTien(item.amount),
        trangThai: NHAN_DAT[item.status] || "Không rõ",
      })),
    };
  }

  const tao = dinhDangLuc(user.createdAt);
  const dangNhap = dinhDangLuc(user.last_login_at);
  return {
    venues: san,
    hoSo: {
      ky,
      kyNhan: ky === 7 ? "7 ngày qua" : ky === 365 ? "12 tháng qua" : "30 ngày qua",
      coBieuDo: tran > 0,
      bieuDo: cot,
      kpis: [
        { nhan: "Tổng doanh thu", giaTri: dinhDangTien(tong.payment), icon: "bi-cash-stack", phu: ky === 7 ? "7 ngày qua" : ky === 365 ? "12 tháng qua" : "30 ngày qua", soSanh: soVoiKyTruoc(tong.payment, tong.paymentTruoc) },
        { nhan: "Hoa hồng sàn", giaTri: dinhDangTien(tong.commission), icon: "bi-percent", phu: ky === 7 ? "7 ngày qua" : ky === 365 ? "12 tháng qua" : "30 ngày qua", soSanh: soVoiKyTruoc(tong.commission, tong.commissionTruoc) },
        { nhan: "Số sân đang quản lý", giaTri: String(san.length), icon: "bi-geo-alt", phu: "Toàn bộ", soSanh: null },
        { nhan: "Số lượt đặt", giaTri: String(datNay), icon: "bi-calendar-check", phu: ky === 7 ? "7 ngày qua" : ky === 365 ? "12 tháng qua" : "30 ngày qua", soSanh: soVoiKyTruoc(datNay, datTruoc) },
      ],
      giaoDich: giaoDich.map((item) => ({
        nhan: NHAN_GIAO_DICH[item.type] || "Giao dịch",
        tien: dinhDangTien(item.amount),
        ma: item.booking_code || "",
        luc: dinhDangLuc(item.created_at),
      })),
      hoatDong: [
        tao ? { nhan: "Tạo tài khoản", luc: tao } : null,
        dangNhap ? { nhan: "Đăng nhập lần cuối", luc: dangNhap } : null,
      ].filter(Boolean),
      tao,
      dangNhap,
      sanDangXem,
    },
  };
}

/**
 * Hồ sơ một chủ sân hoặc khách, kèm sân hoặc lịch đặt.
 * @param {string} loai owners hoặc customers.
 * @param {string} id Id user.
 * @param {object} query Tham số kỳ và sân. Bỏ trống khi chỉ cần hồ sơ.
 * @param {boolean} dayDu true thì tính thêm số liệu chủ sân.
 * @returns {Promise<object>}
 */
async function chiTiet(loai, id, query = {}, dayDu = true) {
  const meta = loaiNao(loai);
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ServiceError("Định danh không hợp lệ");
  const user = await User.findOne({ _id: id, role: meta.role, deleted_at: null })
    .select("-password_hash")
    .lean();
  if (!user) throw new ServiceError("Không có tài khoản này");
  if (meta.role === "OWNER") {
    if (!dayDu) return { user, meta, venues: [], money: [], bookings: [], hoSo: null };
    const data = await hoSoChuSan(user, query);
    return { user, meta, money: [], bookings: [], ...data };
  }
  const [rows, dem] = await Promise.all([
    Booking.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("code facilityName date time amount status")
      .lean(),
    Booking.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, n: { $sum: 1 }, tien: { $sum: "$amount" } } },
    ]),
  ]);
  const bookings = rows.map((item) => ({
    ...item,
    tien: dinhDangTien(item.amount),
    trangThai: NHAN_DAT[item.status] || "Không rõ",
  }));
  const tong = dem[0] || { n: 0, tien: 0 };
  return {
    user,
    meta,
    venues: [],
    money: [],
    bookings,
    hoSo: {
      tao: dinhDangLuc(user.createdAt),
      dangNhap: dinhDangLuc(user.last_login_at),
      kpis: [
        { nhan: "Số lượt đặt", giaTri: String(tong.n), icon: "bi-calendar-check", phu: "Toàn bộ" },
        { nhan: "Tổng tiền đặt", giaTri: dinhDangTien(tong.tien), icon: "bi-cash-stack", phu: "Toàn bộ" },
        { nhan: "Lượt gần đây", giaTri: String(bookings.length), icon: "bi-clock-history", phu: "Tối đa 10 dòng" },
      ],
    },
  };
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
