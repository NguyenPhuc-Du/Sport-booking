const MenuItem = require("../../models/menu-item.model");
const { nho, PHIEN_MS } = require("./bo-nho");

/**
 * Dựng cây menu mà người dùng được thấy.
 * @param {string[]} permissions Các mã quyền đang có.
 * @param {object[]} items Mục menu lấy từ database.
 * @returns {object[]} Cây mục cha và mục con.
 * Gọi sau khi đã nạp quyền của người đăng nhập.
 */
function layMenuTheoQuyen(permissions, items) {
  const allowed = new Set(permissions || []);
  const rows = items || [];
  const visible = rows.filter((item) => {
    if (!item.requiredPermission) return true;
    return allowed.has(item.requiredPermission);
  });
  const childrenOf = new Map();
  visible.forEach((item) => {
    const key = item.parentCode || "";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(item);
  });
  childrenOf.forEach((list) => list.sort((a, b) => a.order - b.order));
  return (childrenOf.get("") || [])
    .map((item) => ({
      ...item,
      children: item.path ? [] : childrenOf.get(item.code) || [],
    }))
    .filter((item) => item.path || item.children.length);
}

/**
 * Đọc menu trong database rồi lọc theo quyền.
 * @param {string[]} permissions Mã quyền của user.
 * @returns {Promise<object[]>} Cây menu.
 * Gọi trong middleware nạp menu cho mọi trang admin.
 */
async function layMenuChoUser(permissions) {
  const items = await nho("menu", PHIEN_MS, () => MenuItem.find().sort({ order: 1 }).lean());
  return layMenuTheoQuyen(permissions, items);
}

module.exports = { layMenuTheoQuyen, layMenuChoUser };
