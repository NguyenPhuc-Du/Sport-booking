const store = new Map();
let theHe = 1;

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
 * @returns {Promise<*>}
 */
function nho(key, ttlMs, loader) {
  const full = `${theHe}:${key}`;
  const hit = store.get(full);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.value);
  return Promise.resolve()
    .then(loader)
    .then((value) => {
      store.set(full, { value, exp: Date.now() + ttlMs });
      return value;
    });
}

module.exports = { huyCache, nho };
