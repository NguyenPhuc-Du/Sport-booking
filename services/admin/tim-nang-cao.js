/**
 * Ghép điều kiện tìm. Chỉ nhận tên trường đã nằm trong danh sách cho phép.
 * @param {string} truong Tên cột.
 * @param {string} toan eq, ne, gt, gte, lt, lte, contains.
 * @param {string} giaTri Giá trị người dùng nhập.
 * @param {string} kieu chu, ngay hoặc so.
 * @returns {object|null} Một mệnh đề MongoDB.
 */
function motDieuKien(truong, toan, giaTri, kieu) {
  const hop = ["eq", "ne", "gt", "gte", "lt", "lte", "contains"];
  if (!kieu || !hop.includes(toan) || !giaTri) return null;
  if (kieu === "so") return soSanhSo(truong, toan, giaTri);
  if (kieu === "ngay") return soSanhNgay(truong, toan, giaTri);
  return soSanhChu(truong, toan, giaTri);
}

/**
 * Nối hai mệnh đề bằng và, hoặc, phủ định.
 * @param {object|null} a Điều kiện thứ nhất.
 * @param {object|null} b Điều kiện thứ hai.
 * @param {string} lienKet and, or hoặc not.
 * @returns {object|null}
 */
function ghepHai(a, b, lienKet) {
  if (!a && !b) return null;
  if (a && !b) return a;
  if (!a && b) return lienKet === "not" ? { $nor: [b] } : b;
  if (lienKet === "or") return { $or: [a, b] };
  if (lienKet === "not") return { $and: [a, { $nor: [b] }] };
  return { $and: [a, b] };
}

function thoat(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function soSanhChu(truong, toan, giaTri) {
  if (toan === "contains") return { [truong]: new RegExp(thoat(giaTri), "i") };
  if (toan === "eq") return { [truong]: new RegExp(`^${thoat(giaTri)}$`, "i") };
  if (toan === "ne") return { [truong]: { $not: new RegExp(`^${thoat(giaTri)}$`, "i") } };
  const op = { gt: "$gt", gte: "$gte", lt: "$lt", lte: "$lte" }[toan];
  return op ? { [truong]: { [op]: giaTri } } : null;
}

function soSanhSo(truong, toan, giaTri) {
  const so = Number(String(giaTri).replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(so)) return null;
  if (toan === "eq" || toan === "contains") return { [truong]: so };
  if (toan === "ne") return { [truong]: { $ne: so } };
  const op = { gt: "$gt", gte: "$gte", lt: "$lt", lte: "$lte" }[toan];
  return op ? { [truong]: { [op]: so } } : null;
}

function soSanhNgay(truong, toan, giaTri) {
  const ngay = new Date(`${giaTri}T00:00:00+07:00`);
  if (Number.isNaN(ngay.getTime())) return null;
  const sau = new Date(ngay.getTime() + 24 * 60 * 60 * 1000);
  if (toan === "eq" || toan === "contains") return { [truong]: { $gte: ngay, $lt: sau } };
  if (toan === "ne") return { $or: [{ [truong]: { $lt: ngay } }, { [truong]: { $gte: sau } }] };
  if (toan === "gt") return { [truong]: { $gte: sau } };
  if (toan === "gte") return { [truong]: { $gte: ngay } };
  if (toan === "lt") return { [truong]: { $lt: ngay } };
  if (toan === "lte") return { [truong]: { $lt: sau } };
  return null;
}

module.exports = { motDieuKien, ghepHai };
