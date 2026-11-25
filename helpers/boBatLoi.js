/**
 * Bọc controller bất đồng bộ để lỗi rơi vào middleware xử lý lỗi.
 * @param {Function} handler Hàm async (req, res, next).
 * @returns {Function} Middleware Express.
 * Gọi khi khai báo route, thay cho try/catch lặp lại.
 */
function boBatLoi(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = boBatLoi;
