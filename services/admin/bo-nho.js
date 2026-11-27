const store = new Map();
let theHe = 1;

// Phiên làm việc 8 phút: tìm kiếm và thống kê không hỏi MongoDB lại trong khoảng này.
const PHIEN_MS = 8 * 60 * 1000;

/**
 * Xóa mọi bản nhớ admin. Gọi sau khi ghi tài khoản, quyền hoặc hoa hồng.
 */
function huyCache() {
  theHe += 1;
  store.clear();
}

/**
 * Lấy bản nhớ hoặc gọi loader một lần rồi giữ trong ttlMs.
 * @param {string} key Khóa logic.
 * @param {number} ttlMs Thời gian sống.
 * @param {Function} loader Hàm đọc MongoDB.
 * @param {boolean} [batBuoc] true thì bỏ bản nhớ và tính lại. Nút Làm mới dùng cờ này.
 * @returns {Promise<*>}
 */
function nho(key, ttlMs, loader, batBuoc) {
  const full = `${theHe}:${key}`;
  const hit = store.get(full);
  if (!batBuoc && hit && hit.exp > Date.now()) return Promise.resolve(hit.value);
  return Promise.resolve()
    .then(loader)
    .then((value) => {
      store.set(full, { value, exp: Date.now() + ttlMs, luc: Date.now() });
      return value;
    });
}

/**
 * Giờ lần tính gần nhất của một khóa nhớ.
 * @param {string} key Khóa logic, không gồm thế hệ.
 * @returns {number|null}
 */
function lucNho(key) {
  const hit = store.get(`${theHe}:${key}`);
  return hit ? hit.luc : null;
}

module.exports = { huyCache, nho, lucNho, PHIEN_MS };
