(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PermissionMap = api;
})(typeof window === "undefined" ? null : window, function () {
  const STANDARD = [
    { key: "view", label: "Xem" },
    { key: "create", label: "Tạo" },
    { key: "update", label: "Sửa" },
    { key: "delete", label: "Xóa" },
  ];
  const STANDARD_KEYS = new Set(STANDARD.map((item) => item.key));
  const DANGEROUS = new Set(["delete", "adjust", "change_role", "manage", "override"]);
  const ORDER = ["user", "role", "commission", "ledger", "dashboard", "audit_log"];
  const ICONS = {
    user: "bi-people",
    role: "bi-shield-lock",
    commission: "bi-percent",
    ledger: "bi-journal-bookmark",
    dashboard: "bi-grid",
    audit_log: "bi-journal-text",
  };
  const SHORT = {
    "user:lock": "Khóa",
    "user:reset_password": "Đặt lại MK",
    "user:change_role": "Đổi vai trò",
    "ledger:adjust": "Điều chỉnh sổ",
    "role:manage": "Quản lý vai trò",
    "system:override": "Quyền cao nhất",
  };

  function actionOf(code) {
    const text = String(code || "");
    const cut = text.indexOf(":");
    return cut === -1 ? "" : text.slice(cut + 1);
  }

  function moduleKey(item) {
    if (item.group) return String(item.group);
    const code = String(item.code || "");
    const cut = code.indexOf(":");
    return cut === -1 ? code || "other" : code.slice(0, cut);
  }

  function describe(item) {
    const code = String(item.code || "");
    const full = String(item.description || "").trim();
    return {
      code,
      full,
      label: SHORT[code] || full || code,
      dangerous: DANGEROUS.has(actionOf(code)),
      checked: Boolean(item.checked),
    };
  }

  function buildModules(permissions) {
    const buckets = new Map();
    (permissions || []).forEach((item) => {
      if (!item || !item.code) return;
      const key = moduleKey(item);
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: item.groupLabel || key,
          icon: ICONS[key] || "bi-dot",
          cells: {},
          specials: [],
        });
      }
      const mod = buckets.get(key);
      const entry = describe(item);
      const action = actionOf(entry.code);
      if (STANDARD_KEYS.has(action) && !mod.cells[action]) mod.cells[action] = entry;
      else mod.specials.push(entry);
    });

    return [...buckets.values()].sort((a, b) => {
      const ia = ORDER.indexOf(a.key);
      const ib = ORDER.indexOf(b.key);
      const ra = ia === -1 ? ORDER.length : ia;
      const rb = ib === -1 ? ORDER.length : ib;
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label, "vi");
    });
  }

  function permissionsOf(mod) {
    const items = [];
    STANDARD.forEach((action) => {
      if (mod.cells[action.key]) items.push(mod.cells[action.key]);
    });
    mod.specials.forEach((item) => items.push(item));
    return items;
  }

  function findItem(modules, code) {
    for (const mod of modules) {
      const item = permissionsOf(mod).find((entry) => entry.code === code);
      if (item) return { module: mod, item };
    }
    return null;
  }

  function setItem(mod, item, checked) {
    const view = mod.cells.view || null;
    item.checked = checked;
    if (!view) return;
    if (item === view && !checked) {
      permissionsOf(mod).forEach((entry) => {
        entry.checked = false;
      });
      return;
    }
    if (item !== view && checked) view.checked = true;
  }

  function setChecked(modules, code, checked) {
    const found = findItem(modules, code);
    if (found) setItem(found.module, found.item, checked);
  }

  function setModuleChecked(mod, checked) {
    permissionsOf(mod).forEach((item) => {
      item.checked = checked;
    });
  }

  function setColumn(modules, column, checked) {
    if (column === "all") {
      modules.forEach((mod) => setModuleChecked(mod, checked));
      return;
    }
    modules.forEach((mod) => {
      if (column === "special") {
        mod.specials.forEach((item) => setItem(mod, item, checked));
        return;
      }
      if (mod.cells[column]) setItem(mod, mod.cells[column], checked);
    });
  }

  function applyPreset(modules, preset) {
    modules.forEach((mod) => {
      Object.keys(mod.cells).forEach((key) => {
        const cell = mod.cells[key];
        if (preset === "all") cell.checked = true;
        else if (preset === "view") cell.checked = key === "view";
        else if (preset === "operate") cell.checked = key === "view" || key === "create" || key === "update";
        else cell.checked = false;
      });
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

  function selectedCodes(modules) {
    const codes = [];
    modules.forEach((mod) => {
      permissionsOf(mod).forEach((item) => {
        if (item.checked) codes.push(item.code);
      });
    });
    return codes;
  }

  function diffCodes(before, after) {
    const oldSet = new Set(before);
    const nextSet = new Set(after);
    return {
      added: after.filter((code) => !oldSet.has(code)),
      removed: before.filter((code) => !nextSet.has(code)),
    };
  }

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

  function columnItems(modules, column) {
    const items = [];
    modules.forEach((mod) => {
      if (column === "all") permissionsOf(mod).forEach((item) => items.push(item));
      else if (column === "special") mod.specials.forEach((item) => items.push(item));
      else if (mod.cells[column]) items.push(mod.cells[column]);
    });
    return items;
  }

  function triState(items) {
    if (!items.length) return { checked: false, indeterminate: false, disabled: true };
    const on = items.filter((item) => item.checked).length;
    return {
      checked: on === items.length,
      indeterminate: on > 0 && on < items.length,
      disabled: false,
    };
  }

  function moduleMatches(mod, query, onlyGranted) {
    const granted = permissionsOf(mod).some((item) => item.checked);
    if (onlyGranted && !granted) return false;
    const text = String(query || "").trim().toLowerCase();
    if (!text) return true;
    const blob = [mod.label]
      .concat(permissionsOf(mod).flatMap((item) => [item.label, item.full, item.code]))
      .join(" ")
      .toLowerCase();
    return blob.includes(text);
  }

  function labelFor(modules, code) {
    const found = findItem(modules, code);
    if (!found) return code;
    return `${found.module.label} · ${found.item.full || found.item.label}`;
  }

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

  function snapshot(modules) {
    return modules.map((mod) => ({
      cells: Object.fromEntries(Object.entries(mod.cells).map(([key, item]) => [key, item.checked])),
      specials: mod.specials.map((item) => item.checked),
    }));
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
    moduleMatches,
    labelFor,
    restore,
    snapshot,
  };
});
