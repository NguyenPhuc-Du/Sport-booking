const VAI_TRO = {
  OWNER: "Chủ sân",
  USER: "Khách hàng",
  ADMIN: "Quản trị",
  SUPER_ADMIN: "Super Admin",
  ACCOUNT_ADMIN: "Quản trị tài khoản",
  COMMISSION_ADMIN: "Quản trị hoa hồng",
};

const TRANG_THAI = {
  active: "Hoạt động",
  inactive: "Đã khóa",
};

/**
 * Đổi mã vai trò thành câu tiếng Việt.
 * @param {string} code Mã như OWNER.
 * @returns {string}
 */
function nhanVaiTro(code) {
  return VAI_TRO[code] || "Khác";
}

/**
 * Đổi mã trạng thái thành câu tiếng Việt.
 * @param {string} code active hoặc inactive.
 * @returns {string}
 */
function nhanTrangThai(code) {
  return TRANG_THAI[code] || "Không rõ";
}

module.exports = { nhanVaiTro, nhanTrangThai, VAI_TRO, TRANG_THAI };
