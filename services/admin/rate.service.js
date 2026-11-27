const mongoose = require("mongoose");
const Setting = require("../../models/commission-setting.model");
const Log = require("../../models/commission-setting-log.model");
const User = require("../../models/user.model");
const Venue = require("../../models/facilities.model");
const Ledger = require("../../models/ledger-entry.model");
const { huyCache } = require("./bo-nho");
const { percentLabel } = require("./present");

const COMMISSION_RATE = 0.05;
const SCOPE_MAC_DINH = "mac-dinh";
const SCOPE_CHU = "chu";
const SCOPE_SAN = "san";
const TY_LE_TOI_THIEU = 0;
const TY_LE_TOI_DA = 100;
const GHI_CHU_TOI_DA = 300;
const SO_DONG_NHAT_KY = 20;
const NGAY_XEM_TRUOC = 30;
const MS_MOT_NGAY = 24 * 60 * 60 * 1000;

/**
 * Mức sàn khi chưa có cấu hình trong database.
 * @returns {number} Tỷ lệ dạng 0.05.
 */
function resolveRate() {
  return COMMISSION_RATE;
}

/**
 * Chọn một bản ghi còn hiệu lực. Sân ưu tiên hơn chủ sân, rồi mức sàn.
 * Bản ke_thua hoặc không có số bị bỏ qua để rơi xuống mức thấp hơn.
 * @param {object[]} rows Đã sắp effective_from giảm dần.
 * @param {string|null} ownerId
 * @param {string|null} facilityId
 * @returns {number}
 */
function chonTrongDanhSach(rows, ownerId, facilityId) {
  const san = rows.find((row) => row.scope === SCOPE_SAN && facilityId && String(row.facility_id) === String(facilityId));
  const chu = rows.find((row) => row.scope === SCOPE_CHU && ownerId && String(row.owner_id) === String(ownerId));
  const mac = rows.find((row) => row.scope === SCOPE_MAC_DINH);
  const hop = (row) => row && !row.ke_thua && row.rate != null;
  const chon = [san, chu, mac].find(hop);
  return chon ? chon.rate : COMMISSION_RATE;
}

/**
 * Tỷ lệ áp dụng tại một thời điểm. Chỉ đọc bản ghi liên quan, không kéo cả bảng.
 * Giao dịch cũ không gọi lại hàm này vì tỷ lệ đã ghi trên dòng sổ cái.
 * @param {string} ownerId Chủ sân.
 * @param {string} facilityId Sân.
 * @param {Date} when Thời điểm thanh toán.
 * @returns {Promise<number>}
 */
async function tyLeCho(ownerId, facilityId, when) {
  const moc = when || new Date();
  const chuId = mongoose.isValidObjectId(ownerId) ? ownerId : null;
  const sanId = mongoose.isValidObjectId(facilityId) ? facilityId : null;
  const or = [{ scope: SCOPE_MAC_DINH }];
  if (chuId) or.push({ scope: SCOPE_CHU, owner_id: chuId });
  if (sanId) or.push({ scope: SCOPE_SAN, facility_id: sanId });
  const rows = await Setting.find({ effective_from: { $lte: moc }, $or: or }).sort({ effective_from: -1 }).lean();
  return chonTrongDanhSach(rows, chuId, sanId);
}

/**
 * Bản mới nhất của từng khóa. Danh sách phải đã sắp ngày giảm dần.
 * @param {object[]} settings
 * @returns {{ mac: object|null, chu: Map<string, object>, san: Map<string, object> }}
 */
function chiMucMoiNhat(settings) {
  const chu = new Map();
  const san = new Map();
  let mac = null;
  settings.forEach((row) => {
    if (row.scope === SCOPE_MAC_DINH && !mac) mac = row;
    if (row.scope === SCOPE_CHU && row.owner_id && !chu.has(String(row.owner_id))) chu.set(String(row.owner_id), row);
    if (row.scope === SCOPE_SAN && row.facility_id && !san.has(String(row.facility_id))) san.set(String(row.facility_id), row);
  });
  return { mac, chu, san };
}

/**
 * Bảng cấu hình: mức sàn, từng chủ sân, sân ghi đè, nhật ký.
 * @param {object} query Có sua và tyLe khi bấm xem trước.
 * @returns {Promise<object>}
 */
async function bangCauHinh(query) {
  const [owners, venues, settings, logs] = await Promise.all([
    User.find({ role: "OWNER", deleted_at: null }).select("fullName email").sort({ fullName: 1 }).lean(),
    Venue.find({ deleted: { $ne: true } }).select("name owner_id").lean(),
    Setting.find({}).sort({ effective_from: -1 }).lean(),
    Log.find({}).sort({ created_at: -1 }).limit(SO_DONG_NHAT_KY).lean(),
  ]);
  const muc = chiMucMoiNhat(settings);
  const mac = muc.mac && muc.mac.rate != null ? muc.mac.rate : COMMISSION_RATE;
  const editors = await User.find({
    _id: { $in: settings.map((row) => row.updated_by).filter(Boolean) },
  }).select("fullName").lean();
  const tenSua = new Map(editors.map((row) => [String(row._id), row.fullName]));
  const sanTheoChu = new Map();
  venues.forEach((item) => {
    const key = String(item.owner_id);
    if (!sanTheoChu.has(key)) sanTheoChu.set(key, []);
    sanTheoChu.get(key).push(item);
  });
  const dong = owners.map((owner) => dongChuSan(owner, muc, mac, tenSua, sanTheoChu));
  const xem = query.sua && query.tyLe ? await xemTruoc(query.sua, query.tyLe) : null;
  return { mac: percentLabel(mac), macSo: Math.round(mac * 1000) / 10, dong, logs, xem };
}

/**
 * Một dòng chủ sân trên bảng cấu hình.
 * @param {object} owner
 * @param {{chu: Map, san: Map}} muc
 * @param {number} mac Tỷ lệ sàn đang dùng.
 * @param {Map<string, string>} tenSua
 * @param {Map<string, object[]>} sanTheoChu
 * @returns {object}
 */
function dongChuSan(owner, muc, mac, tenSua, sanTheoChu) {
  const rieng = muc.chu.get(String(owner._id));
  const dungRieng = rieng && !rieng.ke_thua && rieng.rate != null;
  const san = (sanTheoChu.get(String(owner._id)) || []).map((item) => {
    const ghi = muc.san.get(String(item._id));
    const coSo = ghi && !ghi.ke_thua && ghi.rate != null;
    return { id: String(item._id), ten: item.name, tyLe: coSo ? percentLabel(ghi.rate) : "Theo chủ sân" };
  });
  return {
    id: String(owner._id),
    ten: owner.fullName,
    email: owner.email,
    tyLe: dungRieng ? percentLabel(rieng.rate) : percentLabel(mac),
    loai: dungRieng ? "Riêng" : "Mặc định",
    tu: rieng ? new Date(rieng.effective_from).toLocaleDateString("vi-VN") : "—",
    nguoi: rieng && rieng.updated_by ? tenSua.get(String(rieng.updated_by)) || "—" : "—",
    san,
  };
}

/**
 * So sánh hoa hồng 30 ngày nếu áp tỷ lệ mới. Không ghi database.
 * @param {string} ownerId
 * @param {string|number} tyLePhanTram
 * @returns {Promise<{doanhThu: string, cu: string, moi: string}>}
 */
async function xemTruoc(ownerId, tyLePhanTram) {
  const tu = new Date(Date.now() - NGAY_XEM_TRUOC * MS_MOT_NGAY);
  const rows = await Ledger.aggregate([
    {
      $match: {
        type: "payment",
        owner_id: new mongoose.Types.ObjectId(String(ownerId)),
        created_at: { $gte: tu },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const doanhThu = rows[0] ? rows[0].total : 0;
  const cu = await tyLeCho(ownerId, null, new Date());
  const moi = Number(tyLePhanTram) / 100;
  const tien = (n) => `${new Intl.NumberFormat("vi-VN").format(Math.round(n))} đ`;
  return { doanhThu: tien(doanhThu), cu: tien(doanhThu * cu), moi: tien(doanhThu * moi) };
}

/**
 * Ghi tỷ lệ mới. Không sửa dòng hoa hồng đã chốt.
 * @param {object} body scope, rate, keThua, effectiveFrom, note, ownerId, facilityId.
 * @param {string} actorId Người sửa.
 * @throws {Error} Khi tỷ lệ ngoài 0–100. error.status = 400.
 */
async function luu(body, actorId) {
  const scope = body.scope === SCOPE_SAN || body.scope === SCOPE_CHU ? body.scope : SCOPE_MAC_DINH;
  const keThua = body.keThua === "1";
  const so = Number(String(body.rate || "").replace(",", "."));
  if (!keThua && (!Number.isFinite(so) || so < TY_LE_TOI_THIEU || so > TY_LE_TOI_DA)) {
    const error = new Error("Tỷ lệ phải từ 0 đến 100");
    error.status = 400;
    throw error;
  }
  const when = body.effectiveFrom ? new Date(`${body.effectiveFrom}T00:00:00+07:00`) : new Date();
  const ownerId = scope === SCOPE_MAC_DINH ? null : body.ownerId || null;
  const facilityId = scope === SCOPE_SAN ? body.facilityId || null : null;
  const note = String(body.note || "").slice(0, GHI_CHU_TOI_DA);
  const cu = await Setting.findOne({ scope, owner_id: ownerId, facility_id: facilityId }).sort({ effective_from: -1 }).lean();
  const rate = keThua ? null : so / 100;
  await Setting.create({
    scope,
    owner_id: ownerId,
    facility_id: facilityId,
    rate,
    ke_thua: keThua,
    effective_from: when,
    note,
    updated_by: actorId,
  });
  await Log.create({
    scope,
    owner_id: ownerId,
    facility_id: facilityId,
    rate_cu: cu ? cu.rate : null,
    rate_moi: rate,
    effective_from: when,
    note,
    actor_id: actorId,
  });
  huyCache();
}

module.exports = { COMMISSION_RATE, resolveRate, tyLeCho, bangCauHinh, luu };
