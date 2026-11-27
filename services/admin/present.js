/**
 * Định dạng tiền Việt Nam cho bảng quản trị.
 * @param {number|string} value Số tiền.
 * @returns {string} Ví dụ "1.000.000 ₫".
 */
function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

/**
 * Hiện tỷ lệ hoa hồng. 0.05 thành "5%". Làm tròn một chữ số thập phân.
 * @param {number} rate Tỷ lệ dạng số thập phân.
 * @returns {string}
 */
function percentLabel(rate) {
  const value = Math.round(Number(rate) * 1000) / 10;
  return `${value}%`;
}

module.exports = { formatVnd, percentLabel };
