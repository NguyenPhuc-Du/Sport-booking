(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PermissionMap = api;
})(typeof window === "undefined" ? null : window, function () {
  // Bốn cột quen. Quyền không thuộc bốn cột này hiện thành một dòng riêng trong nhóm.
  const STANDARD = [
    { key: "view", label: "Xem" },
    { key: "create", label: "Tạo" },
    { key: "update", label: "Sửa" },
    { key: "delete", label: "Xóa" },
  ];
  const STANDARD_KEYS = new Set(STANDARD.map((item) => item.key));

  // Lấy phần sau dấu hai chấm. Vào: "user:view". Ra: "view".
  function actionOf(code) {
    const text = String(code || "");
    const cut = text.indexOf(":");
    return cut === -1 ? "" : text.slice(cut + 1);
  }

  // Nhóm của một quyền. Ưu tiên group do server gửi. Vào: một quyền. Ra: chuỗi khóa nhóm.
  function moduleKey(item) {
    if (item.group) return String(item.group);
    const code = String(item.code || "");
    const cut = code.indexOf(":");
    return cut === -1 ? code || "other" : code.slice(0, cut);
  }

  // Chuẩn hóa một quyền để UI chỉ việc đọc. Tên và cờ nhạy cảm đến từ server.
  function describe(item) {
    const code = String(item.code || "");
    const full = String(item.description || item.sentence || "").trim();
    return {
      code,
      full,
      label: String(item.label || full || code),
      reason: String(item.caution || ""),
      dangerous: Boolean(item.dangerous),
      checked: Boolean(item.checked),
    };
  }

  // Tạo một nhóm rỗng nếu chưa có. Vào: bảng nhóm, khóa, quyền gốc. Ra: nhóm.
  function bucketFor(buckets, key, item) {
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: item.groupLabel || key,
        icon: item.icon || "bi-dot",
        cells: {},
        specials: [],
      });
    }
    return buckets.get(key);
  }

  // Xếp quyền vào ô Xem/Tạo/Sửa/Xóa hoặc vào danh sách việc khác của nhóm.
  function placeEntry(mod, entry) {
    const action = actionOf(entry.code);
    if (STANDARD_KEYS.has(action) && !mod.cells[action]) mod.cells[action] = entry;
    else mod.specials.push(entry);
  }

  // Sắp nhóm theo thứ tự server gửi. Nhóm lạ đứng cuối, rồi theo tên tiếng Việt.
  function sortModules(modules, order) {
    const rank = Array.isArray(order) ? order : [];
    return modules.sort((left, right) => {
      const leftAt = rank.indexOf(left.key);
      const rightAt = rank.indexOf(right.key);
      const leftRank = leftAt === -1 ? rank.length : leftAt;
      const rightRank = rightAt === -1 ? rank.length : rightAt;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.label.localeCompare(right.label, "vi");
    });
  }

  // Gom danh sách quyền phẳng thành các nhóm. Vào: mảng quyền, thứ tự nhóm. Ra: mảng nhóm.
  function buildModules(permissions, order) {
    const buckets = new Map();
    (permissions || []).forEach((item) => {
      if (!item || !item.code) return;
      const key = moduleKey(item);
      placeEntry(bucketFor(buckets, key, item), describe(item));
    });
    return sortModules([...buckets.values()], order);
  }

  // Mọi quyền của một nhóm, cột chuẩn trước rồi đến việc khác. Vào: một nhóm. Ra: mảng quyền.
  function permissionsOf(mod) {
    const items = [];
    STANDARD.forEach((action) => {
      if (mod.cells[action.key]) items.push(mod.cells[action.key]);
    });
    mod.specials.forEach((item) => items.push(item));
    return items;
  }

  // Tìm quyền theo mã. Vào: các nhóm, mã. Ra: { module, item } hoặc null.
  function findItem(modules, code) {
    for (const mod of modules) {
      const item = permissionsOf(mod).find((entry) => entry.code === code);
      if (item) return { module: mod, item };
    }
    return null;
  }

  // Bật hoặc tắt một quyền trong nhóm. Bật việc khác thì bật Xem. Tắt Xem thì tắt cả nhóm.
  // Vì sao: không cho "tạo" khi người đó không được "xem".
  function setItem(mod, item, checked) {
    const view = mod.cells.view || null;
    item.checked = checked;
    if (!view || (item === view && checked)) return;
    if (item === view && !checked) {
      permissionsOf(mod).forEach((entry) => {
        entry.checked = false;
      });
      return;
    }
    if (checked) view.checked = true;
  }

  // Bật hoặc tắt theo mã. Vào: các nhóm, mã, true/false. Không trả về. Gọi khi người dùng tick một dòng.
  function setChecked(modules, code, checked) {
    const found = findItem(modules, code);
    if (found) setItem(found.module, found.item, checked);
  }

  // Chọn hoặc bỏ cả nhóm. Vào: một nhóm, true/false. Gọi khi tick "Chọn tất cả" của nhóm.
  function setModuleChecked(mod, checked) {
    permissionsOf(mod).forEach((item) => {
      item.checked = checked;
    });
    if (checked && mod.cells.view) mod.cells.view.checked = true;
  }

  // Bật một cột trên mọi nhóm. "all" nghĩa là mọi quyền. Gọi từ mã cũ, UI danh sách không dùng cột.
  function setColumn(modules, column, checked) {
    if (column === "all") {
      modules.forEach((mod) => setModuleChecked(mod, checked));
      return;
    }
    modules.forEach((mod) => {
      if (column === "special") mod.specials.forEach((item) => setItem(mod, item, checked));
      else if (mod.cells[column]) setItem(mod, mod.cells[column], checked);
    });
  }

  // Áp một mẫu lên ô chuẩn. all bật hết, view chỉ Xem, operate là Xem/Tạo/Sửa, none tắt.
  function applyCellPreset(cell, key, preset) {
    if (preset === "all") cell.checked = true;
    else if (preset === "view") cell.checked = key === "view";
    else if (preset === "operate") cell.checked = key === "view" || key === "create" || key === "update";
    else cell.checked = false;
  }

  // Áp mẫu cho cả nhóm, kể cả quyền nhạy cảm. Gọi khi cần đặt nhanh một bộ quyền.
  function applyPreset(modules, preset) {
    modules.forEach((mod) => {
      Object.keys(mod.cells).forEach((key) => applyCellPreset(mod.cells[key], key, preset));
      mod.specials.forEach((item) => {
        if (preset === "all") item.checked = true;
        else if (preset === "operate") item.checked = !item.dangerous;
        else item.checked = false;
      });
      const view = mod.cells.view;
      const needsView = permissionsOf(mod).some((item) => item !== view && item.checked);
      if (view && needsView) view.checked = true;
    });
  }

  // Các mã đang được tick. Vào: các nhóm. Ra: mảng mã. Gọi khi lưu.
  function selectedCodes(modules) {
    const codes = [];
    modules.forEach((mod) => {
      permissionsOf(mod).forEach((item) => {
        if (item.checked) codes.push(item.code);
      });
    });
    return codes;
  }

  // So sánh hai danh sách mã. Ra: { added, removed }. Gọi trước khi mở hộp xác nhận lưu.
  function diffCodes(before, after) {
    const oldSet = new Set(before);
    const nextSet = new Set(after);
    return {
      added: after.filter((code) => !oldSet.has(code)),
      removed: before.filter((code) => !nextSet.has(code)),
    };
  }

  // Đếm quyền đang bật và tổng quyền. Ra: { granted, total }. Gọi mỗi lần vẽ lại.
  function countGranted(modules) {
    let granted = 0;
    let total = 0;
    modules.forEach((mod) => {
      permissionsOf(mod).forEach((item) => {
        total += 1;
        if (item.checked) granted += 1;
      });
    });
    return { granted, total };
  }

  // Các quyền thuộc một cột. Dùng cho trạng thái tick một phần của cột.
  function columnItems(modules, column) {
    const items = [];
    modules.forEach((mod) => {
      if (column === "all") permissionsOf(mod).forEach((item) => items.push(item));
      else if (column === "special") mod.specials.forEach((item) => items.push(item));
      else if (mod.cells[column]) items.push(mod.cells[column]);
    });
    return items;
  }

  // Trạng thái checkbox cha: đủ, một phần, hoặc trống. Ra: { checked, indeterminate, disabled }.
  function triState(items) {
    if (!items.length) return { checked: false, indeterminate: false, disabled: true };
    const on = items.filter((item) => item.checked).length;
    return {
      checked: on === items.length,
      indeterminate: on > 0 && on < items.length,
      disabled: false,
    };
  }

  // Quyền có khớp chữ tìm không. Vào: một quyền, chuỗi tìm. Ra: true/false.
  function itemMatches(item, query) {
    const text = String(query || "").trim().toLowerCase();
    if (!text) return true;
    return [item.label, item.full, item.code].join(" ").toLowerCase().includes(text);
  }

  // Nhóm có hiện không. onlyGranted bỏ nhóm chưa cấp quyền nào. Gọi khi lọc.
  function moduleMatches(mod, query, onlyGranted) {
    const items = permissionsOf(mod);
    if (onlyGranted && !items.some((item) => item.checked)) return false;
    return items.some((item) => itemMatches(item, query));
  }

  // Câu "Nhóm · tên quyền" cho hộp xác nhận. Vào: các nhóm, mã. Ra: chuỗi.
  function labelFor(modules, code) {
    const found = findItem(modules, code);
    if (!found) return code;
    return `${found.module.label} · ${found.item.label}`;
  }

  // Trả checkbox về lúc mở trang. Vào: các nhóm và bản chụp từ snapshot. Gọi khi bấm Hoàn tác.
  function restore(modules, snap) {
    modules.forEach((mod, index) => {
      const saved = snap[index];
      if (!saved) return;
      Object.entries(mod.cells).forEach(([key, item]) => {
        item.checked = Boolean(saved.cells[key]);
      });
      mod.specials.forEach((item, itemIndex) => {
        item.checked = Boolean(saved.specials[itemIndex]);
      });
    });
  }

  // Chụp trạng thái tick để hoàn tác. Vào: các nhóm. Ra: mảng trạng thái. Gọi lúc mở trang.
  function snapshot(modules) {
    return modules.map((mod) => ({
      cells: Object.fromEntries(Object.entries(mod.cells).map(([key, item]) => [key, item.checked])),
      specials: mod.specials.map((item) => item.checked),
    }));
  }

  // Menu mà vai trò được thấy. Vào: các nhóm và menu do server gửi. Ra: các mục menu còn lại.
  function previewMenu(modules, menu) {
    const owned = new Set(selectedCodes(modules));
    return (menu || []).filter((item) => owned.has(item.permission));
  }

  // Một câu "Vai trò này thấy: ...". Vào: các nhóm, menu. Ra: chuỗi. Gọi mỗi lần tick.
  function menuLine(modules, menu) {
    const names = previewMenu(modules, menu).map((item) => item.text);
    if (!names.length) return "Vai trò này chưa thấy mục nào trên menu.";
    return `Vai trò này thấy: ${names.join(", ")}.`;
  }

  return {
    STANDARD,
    buildModules,
    permissionsOf,
    setChecked,
    setModuleChecked,
    setColumn,
    applyPreset,
    selectedCodes,
    diffCodes,
    countGranted,
    columnItems,
    triState,
    itemMatches,
    moduleMatches,
    labelFor,
    previewMenu,
    menuLine,
    restore,
    snapshot,
  };
});
