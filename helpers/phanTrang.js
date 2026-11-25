/**
 * Ép trang và số dòng về giá trị hợp lệ.
 * @param {string|number} page Trang người dùng gửi.
 * @param {string|number} pageSize Số dòng mỗi trang.
 * @returns {{page: number, pageSize: number}}
 * Gọi trước khi truy vấn danh sách.
 */
function chuanHoaTrang(page, pageSize) {
  const asked = Number(pageSize);
  const size = asked >= 1 && asked <= 100 ? Math.floor(asked) : 10;
  const current = Math.max(parseInt(page, 10) || 1, 1);
  return { page: current, pageSize: size };
}

/**
 * Danh sách số trang có dấu … khi có nhiều trang.
 * @param {number} current Trang hiện tại.
 * @param {number} total Tổng số trang.
 * @returns {Array<number|string>}
 */
function soTrangHien(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i += 1) {
    const near = i === 1 || i === total || Math.abs(i - current) <= 1;
    if (near) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return pages;
}

/**
 * Lấy một trang dữ liệu từ MongoDB.
 * @param {object} input model, filter, sort, page, pageSize, populate, select.
 * @returns {Promise<object>} items, total, page, pageSize, totalPages, from, to, hasPrev, hasNext, pageList.
 * Gọi từ service khi vẽ bảng admin.
 */
function truyVanTrang(input, filter, page, pageSize) {
  let query = input.model
    .find(filter)
    .sort(input.sort || { createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize);
  if (input.select) query = query.select(input.select);
  if (input.populate) query = query.populate(input.populate);
  return query.lean();
}

async function phanTrang(input) {
  const safe = chuanHoaTrang(input.page, input.pageSize);
  const filter = input.filter || {};
  const [total, firstItems] = await Promise.all([
    input.model.countDocuments(filter),
    truyVanTrang(input, filter, safe.page, safe.pageSize),
  ]);
  const totalPages = Math.max(Math.ceil(total / safe.pageSize), 1);
  const page = Math.min(safe.page, totalPages);
  // Trang quá lớn thì lần đếm song song trả mảng rỗng, phải lấy lại đúng trang cuối.
  const items =
    page === safe.page
      ? firstItems
      : await truyVanTrang(input, filter, page, safe.pageSize);
  const from = total === 0 ? 0 : (page - 1) * safe.pageSize + 1;
  const to = total === 0 ? 0 : from + items.length - 1;
  return {
    items,
    total,
    page,
    pageSize: safe.pageSize,
    totalPages,
    from,
    to,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    pageList: soTrangHien(page, totalPages),
  };
}

/**
 * Gắn đường link Trước/Sau/số trang, giữ nguyên query đang lọc.
 * @param {object} pagination Kết quả phanTrang.
 * @param {string} path Đường dẫn trang, ví dụ /admin/accounts/owners.
 * @param {object} query Các query được giữ, không gồm page.
 * @returns {object} pagination kèm href.
 */
function ganLink(pagination, path, query) {
  const base = query || {};
  const hrefFor = (page) => {
    const params = new URLSearchParams();
    Object.entries(base).forEach(([key, value]) => {
      if (value != null && value !== "" && key !== "page") params.set(key, String(value));
    });
    params.set("page", String(page));
    return `${path}?${params.toString()}`;
  };
  return {
    ...pagination,
    prevHref: pagination.hasPrev ? hrefFor(pagination.page - 1) : "",
    nextHref: pagination.hasNext ? hrefFor(pagination.page + 1) : "",
    links: pagination.pageList.map((item) =>
      item === "…"
        ? { gap: true }
        : { label: item, href: hrefFor(item), active: item === pagination.page },
    ),
  };
}

module.exports = { chuanHoaTrang, soTrangHien, phanTrang, ganLink };
