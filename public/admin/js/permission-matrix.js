(function () {
  const map = window.PermissionMap;
  const PRESET_TEXT = {
    view: "Chỉ giữ quyền Xem của mọi module? Các quyền khác sẽ bị bỏ, kể cả module đang bị lọc ẩn.",
    operate: "Bật Xem, Tạo, Sửa và quyền đặc biệt không nguy hiểm? Quyền xóa, điều chỉnh sổ, đổi vai trò và quản lý vai trò sẽ tắt.",
    all: "Bật mọi quyền của vai trò này?",
    none: "Bỏ toàn bộ quyền đang chọn?",
  };

  const retry = document.getElementById("pm-retry");
  if (retry) retry.addEventListener("click", () => location.reload());

  function showError() {
    document.querySelectorAll(".pm-skel").forEach((node) => node.remove());
    const box = document.getElementById("pm-error");
    if (box) box.hidden = false;
  }

  function showToast(text, kind) {
    let toast = document.getElementById("pm-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pm-toast";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    toast.className = kind === "error" ? "pm-toast is-error" : "pm-toast is-ok";
    toast.textContent = text;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.remove(), 3200);
  }

  function readPayload() {
    const node = document.getElementById("pm-data");
    if (!node) throw new Error("Thiếu dữ liệu quyền");
    const data = JSON.parse(node.textContent || "");
    if (!data || !Array.isArray(data.permissions)) throw new Error("Dữ liệu quyền không đúng");
    return data;
  }

  function boot() {
    const pending = sessionStorage.getItem("pm-toast");
    if (pending) {
      sessionStorage.removeItem("pm-toast");
      showToast(pending, "ok");
    }

    const data = readPayload();
    const nameInput = document.getElementById("pm-name");
    const descInput = document.getElementById("pm-desc");
    const board = document.querySelector(".pm-board");
    const modules = map.buildModules(data.permissions);
    const state = {
      roleId: data.roleId,
      readOnly: Boolean(data.readOnly),
      nameLocked: Boolean(data.nameLocked),
      modules,
      baseline: map.snapshot(modules),
      baselineCodes: map.selectedCodes(modules),
      baselineName: nameInput ? nameInput.value.trim() : "",
      baselineDesc: descInput ? descInput.value.trim() : "",
      query: "",
      onlyGranted: false,
      saving: false,
      leaving: false,
      columnInputs: {},
    };

    if (board) board.classList.toggle("is-readonly", state.readOnly);
    document.querySelectorAll(".pm-skel").forEach((node) => node.remove());

    const ui = { paint() {} };
    const summary = PermissionSummaryBar(document.getElementById("pm-tools"), state, () => ui.paint());
    const matrix = PermissionMatrix(document.getElementById("pm-matrix"), state);
    const save = StickySaveBar();

    function profileNotes() {
      if (state.nameLocked || !nameInput || !descInput) return [];
      const notes = [];
      const name = nameInput.value.trim();
      const desc = descInput.value.trim();
      if (name !== state.baselineName) notes.push(`Tên: ${state.baselineName || "—"} → ${name || "—"}`);
      if (desc !== state.baselineDesc) notes.push(`Mô tả: ${state.baselineDesc || "—"} → ${desc || "—"}`);
      return notes;
    }

    function permissionDiff() {
      if (state.readOnly) return { added: [], removed: [] };
      return map.diffCodes(state.baselineCodes, map.selectedCodes(state.modules));
    }

    function dirtyCount() {
      const diff = permissionDiff();
      return diff.added.length + diff.removed.length + profileNotes().length;
    }

    ui.paint = function paint() {
      const counts = map.countGranted(state.modules);
      summary.count.textContent = counts.total
        ? `Đã cấp ${counts.granted}/${counts.total} quyền`
        : "Chưa có quyền";
      const width = counts.total ? Math.round((counts.granted / counts.total) * 100) : 0;
      summary.bar.style.width = `${width}%`;
      summary.progress.setAttribute("aria-valuenow", String(counts.granted));
      summary.progress.setAttribute("aria-valuemax", String(counts.total || 0));
      summary.progress.setAttribute("aria-label", summary.count.textContent);

      let visible = 0;
      state.modules.forEach((mod) => {
        const show = map.moduleMatches(mod, state.query, state.onlyGranted);
        mod.row.hidden = !show;
        if (show) visible += 1;
        map.permissionsOf(mod).forEach((item) => {
          if (item.input) item.input.checked = item.checked;
        });
        setTri(mod.allInput, map.triState(map.permissionsOf(mod)));
      });
      matrix.empty.hidden = visible !== 0;
      matrix.emptyText.textContent = state.modules.length
        ? "Không có module khớp bộ lọc."
        : "Chưa có quyền nào trong hệ thống.";

      Object.keys(state.columnInputs).forEach((column) => {
        const input = state.columnInputs[column];
        const tri = map.triState(map.columnItems(state.modules, column));
        input.disabled = state.readOnly || tri.disabled;
        setTri(input, tri);
      });

      const count = dirtyCount();
      save.bar.hidden = count === 0;
      save.text.textContent = `Có ${count} thay đổi chưa lưu`;
    };

    matrix.root.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.disabled) return;
      const column = input.getAttribute("data-column");
      const code = input.getAttribute("data-code");
      const moduleKey = input.getAttribute("data-module");
      if (column) map.setColumn(state.modules, column, input.checked);
      else if (code) map.setChecked(state.modules, code, input.checked);
      else if (moduleKey) {
        const mod = state.modules.find((item) => item.key === moduleKey);
        if (mod) map.setModuleChecked(mod, input.checked);
      }
      ui.paint();
    });

    if (nameInput) nameInput.addEventListener("input", () => ui.paint());
    if (descInput) descInput.addEventListener("input", () => ui.paint());

    save.revert.addEventListener("click", () => {
      map.restore(state.modules, state.baseline);
      if (nameInput) nameInput.value = state.baselineName;
      if (descInput) descInput.value = state.baselineDesc;
      ui.paint();
    });
    save.save.addEventListener("click", () => openConfirm());
    save.confirm.addEventListener("click", () => store());

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirtyCount() > 0) openConfirm();
      }
    });
    document.addEventListener("submit", (event) => {
      if (!event.defaultPrevented) state.leaving = true;
    });
    window.addEventListener("beforeunload", (event) => {
      if (state.leaving || dirtyCount() === 0) return;
      event.preventDefault();
      event.returnValue = "";
    });
    save.dialog.addEventListener("cancel", (event) => {
      if (state.saving) event.preventDefault();
    });

    function openConfirm() {
      if (dirtyCount() === 0 || save.dialog.open) return;
      if (!state.nameLocked && nameInput && !nameInput.value.trim()) {
        showToast("Nhập tên vai trò", "error");
        nameInput.focus();
        return;
      }
      const diff = permissionDiff();
      save.lead.textContent = diff.added.length || diff.removed.length
        ? "Quyền được thêm màu xanh, quyền bị gỡ màu đỏ. Người đang giữ vai trò này phải đăng nhập lại."
        : "Lưu tên và mô tả của vai trò.";
      save.body.replaceChildren();
      profileNotes().forEach((text) => save.body.append(diffLine(text, "is-add")));
      diff.added.forEach((code) => save.body.append(diffLine(`Thêm: ${map.labelFor(state.modules, code)}`, "is-add")));
      diff.removed.forEach((code) => save.body.append(diffLine(`Gỡ: ${map.labelFor(state.modules, code)}`, "is-del")));
      save.error.textContent = "";
      if (save.dialog.parentElement !== document.body) document.body.appendChild(save.dialog);
      save.dialog.showModal();
    }

    async function store() {
      if (state.saving) return;
      state.saving = true;
      save.confirm.disabled = true;
      save.confirm.textContent = "Đang lưu...";
      save.error.textContent = "";
      try {
        if (profileNotes().length) {
          await postForm(`/admin/roles/${state.roleId}`, {
            name: nameInput.value.trim(),
            description: descInput.value.trim(),
          });
          state.baselineName = nameInput.value.trim();
          state.baselineDesc = descInput.value.trim();
        }
        const diff = permissionDiff();
        if (diff.added.length || diff.removed.length) {
          await postForm(`/admin/roles/${state.roleId}/permissions`, {
            permissions: map.selectedCodes(state.modules),
          });
        }
        state.leaving = true;
        sessionStorage.setItem("pm-toast", "Đã lưu thay đổi");
        location.reload();
      } catch (error) {
        state.saving = false;
        save.confirm.disabled = false;
        save.confirm.textContent = "Lưu thay đổi";
        save.error.textContent = error.message || "Không lưu được. Thử lại.";
      }
    }

    ui.paint();
  }

  function setTri(input, tri) {
    if (!input) return;
    input.checked = tri.checked;
    input.indeterminate = tri.indeterminate;
    input.setAttribute("aria-checked", tri.indeterminate ? "mixed" : String(tri.checked));
  }

  function diffLine(text, kind) {
    const item = document.createElement("li");
    item.className = kind;
    item.textContent = text;
    return item;
  }

  function checkboxLabel(text, onChange) {
    const label = document.createElement("label");
    label.className = "pm-filter";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.addEventListener("change", () => onChange(input.checked));
    const span = document.createElement("span");
    span.textContent = text;
    label.append(input, span);
    return label;
  }

  function PermissionSummaryBar(host, state, onPaint) {
    const wrap = document.createElement("div");
    wrap.className = "pm-summary";
    const meta = document.createElement("div");
    meta.className = "pm-count";
    const count = document.createElement("strong");
    count.setAttribute("aria-live", "polite");
    const progress = document.createElement("div");
    progress.className = "pm-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    const bar = document.createElement("span");
    progress.append(bar);
    meta.append(count, progress);

    const search = document.createElement("input");
    search.className = "sz-input pm-search";
    search.type = "search";
    search.placeholder = "Tìm module";
    search.setAttribute("aria-label", "Tìm module");
    search.addEventListener("input", () => {
      state.query = search.value;
      onPaint();
    });

    wrap.append(
      meta,
      search,
      checkboxLabel("Chỉ hiện quyền đã cấp", (checked) => {
        state.onlyGranted = checked;
        onPaint();
      }),
      checkboxLabel("Hiện key kỹ thuật", (checked) => {
        const board = host.closest(".pm-board");
        if (board) board.classList.toggle("is-codes", checked);
      }),
    );
    host.append(wrap);

    if (!state.readOnly) {
      const presets = document.createElement("div");
      presets.className = "pm-presets";
      presets.setAttribute("role", "group");
      presets.setAttribute("aria-label", "Mẫu quyền nhanh");
      [
        ["view", "Chỉ xem"],
        ["operate", "Vận hành"],
        ["all", "Toàn quyền"],
        ["none", "Bỏ chọn tất cả"],
      ].forEach(([preset, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "sz-btn sz-btn-sm pm-preset";
        button.textContent = label;
        button.addEventListener("click", () => {
          if (!window.confirm(PRESET_TEXT[preset])) return;
          map.applyPreset(state.modules, preset);
          onPaint();
        });
        presets.append(button);
      });
      const hint = document.createElement("p");
      hint.className = "pm-hint";
      hint.textContent = "Bật Tạo, Sửa, Xóa hoặc quyền đặc biệt sẽ tự bật Xem. Bỏ Xem sẽ bỏ các quyền còn lại của module đó.";
      host.append(presets, hint);
    }

    return { count, bar, progress };
  }

  function dash(actionLabel) {
    const span = document.createElement("span");
    span.className = "pm-na";
    span.textContent = "—";
    span.title = "Không áp dụng";
    span.setAttribute("aria-label", `Không có quyền ${actionLabel}`);
    return span;
  }

  function bindBox(input, item, mod, actionLabel) {
    input.checked = item.checked;
    input.setAttribute("aria-label", `Cấp quyền ${actionLabel} cho module ${mod.label}`);
    const tips = [item.full || item.label];
    if (mod.cells.view && item === mod.cells.view) tips.push("Bỏ Xem sẽ tắt mọi quyền khác của module này.");
    if (mod.cells.view && item !== mod.cells.view) tips.push("Bật quyền này sẽ tự bật Xem.");
    tips.push(item.code);
    input.title = tips.join(" ");
    item.input = input;
  }

  function SpecialPermissionChips(mod, readOnly) {
    const box = document.createElement("div");
    box.className = "pm-chips";
    if (!mod.specials.length) {
      box.append(dash("đặc biệt"));
      return box;
    }
    mod.specials.forEach((item) => {
      const label = document.createElement("label");
      label.className = item.dangerous ? "pm-chip is-danger" : "pm-chip";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.disabled = readOnly;
      input.setAttribute("data-code", item.code);
      bindBox(input, item, mod, item.label);
      const text = document.createElement("span");
      text.textContent = item.label;
      const code = document.createElement("code");
      code.className = "pm-code";
      code.textContent = item.code;
      label.append(input, text, code);
      box.append(label);
    });
    return box;
  }

  function MatrixRow(mod, readOnly) {
    const tr = document.createElement("tr");
    const head = document.createElement("th");
    head.scope = "row";
    const icon = document.createElement("i");
    icon.className = `bi ${mod.icon}`;
    icon.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.textContent = mod.label;
    head.append(icon, name);
    tr.append(head);

    map.STANDARD.forEach((action) => {
      const cell = document.createElement("td");
      cell.className = "pm-act";
      cell.dataset.label = action.label;
      const item = mod.cells[action.key];
      if (!item) cell.append(dash(action.label));
      else {
        const label = document.createElement("label");
        label.className = item.dangerous ? "pm-hit is-danger" : "pm-hit";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.disabled = readOnly;
        input.setAttribute("data-code", item.code);
        bindBox(input, item, mod, action.label);
        const code = document.createElement("code");
        code.className = "pm-code";
        code.textContent = item.code;
        label.append(input, code);
        cell.append(label);
      }
      tr.append(cell);
    });

    const special = document.createElement("td");
    special.dataset.label = "Quyền đặc biệt";
    special.append(SpecialPermissionChips(mod, readOnly));
    tr.append(special);

    const allCell = document.createElement("td");
    allCell.className = "pm-act";
    allCell.dataset.label = "Tất cả";
    const allLabel = document.createElement("label");
    allLabel.className = "pm-hit";
    const allInput = document.createElement("input");
    allInput.type = "checkbox";
    allInput.disabled = readOnly || map.permissionsOf(mod).length === 0;
    allInput.setAttribute("data-module", mod.key);
    allInput.setAttribute("aria-label", `Cấp mọi quyền cho module ${mod.label}`);
    allInput.title = "Chọn hoặc bỏ mọi quyền của module này";
    allLabel.append(allInput);
    allCell.append(allLabel);
    tr.append(allCell);
    mod.row = tr;
    mod.allInput = allInput;
    return tr;
  }

  function columnHeader(state, column, label, dangerous) {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = "pm-act";
    const wrap = document.createElement("label");
    wrap.className = "pm-col";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = state.readOnly;
    input.setAttribute("data-column", column);
    const caption = column === "all" ? "Cấp mọi quyền cho mọi module" : `Cấp quyền ${label} cho mọi module`;
    input.setAttribute("aria-label", caption);
    input.title = "Áp dụng cho mọi module, kể cả module đang bị bộ lọc ẩn";
    const text = document.createElement("span");
    text.textContent = label;
    wrap.append(input, text);
    if (dangerous) {
      const dot = document.createElement("i");
      dot.className = "pm-dot";
      dot.title = "Quyền nguy hiểm";
      wrap.append(dot);
    }
    th.append(wrap);
    state.columnInputs[column] = input;
    return th;
  }

  function PermissionMatrix(host, state) {
    const table = document.createElement("table");
    table.className = "pm-table";
    table.setAttribute("aria-label", "Ma trận phân quyền");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const moduleHead = document.createElement("th");
    moduleHead.scope = "col";
    moduleHead.textContent = "Module";
    headRow.append(moduleHead);
    map.STANDARD.forEach((action) => {
      headRow.append(columnHeader(state, action.key, action.label, action.key === "delete"));
    });
    headRow.append(columnHeader(state, "special", "Quyền đặc biệt", false));
    headRow.append(columnHeader(state, "all", "Tất cả", false));
    thead.append(headRow);

    const tbody = document.createElement("tbody");
    state.modules.forEach((mod) => tbody.append(MatrixRow(mod, state.readOnly)));
    const empty = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 7;
    emptyCell.className = "pm-empty";
    const emptyText = document.createElement("p");
    emptyCell.append(emptyText);
    empty.append(emptyCell);
    empty.hidden = true;
    tbody.append(empty);
    table.append(thead, tbody);
    host.append(table);
    return { root: table, empty, emptyText };
  }

  function StickySaveBar() {
    return {
      bar: document.getElementById("pm-save"),
      text: document.getElementById("pm-save-text"),
      revert: document.getElementById("pm-revert"),
      save: document.getElementById("pm-save-btn"),
      dialog: document.getElementById("pm-confirm"),
      lead: document.getElementById("pm-confirm-lead"),
      body: document.getElementById("pm-confirm-body"),
      error: document.getElementById("pm-confirm-error"),
      confirm: document.getElementById("pm-confirm-save"),
    };
  }

  async function postForm(url, fields) {
    const body = new URLSearchParams();
    Object.entries(fields).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((item) => body.append(key, item));
      else body.append(key, value == null ? "" : String(value));
    });
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "text/html" },
        body,
        credentials: "same-origin",
      });
    } catch (error) {
      throw new Error("Không kết nối được máy chủ. Thử lại.");
    }
    if (/\/admin\/auth\/login/.test(response.url)) {
      throw new Error("Phiên đăng nhập đã hết. Hãy đăng nhập lại.");
    }
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const error = doc.querySelector(".alert-danger .alert-text");
    if (error && error.textContent.trim()) throw new Error(error.textContent.trim());
    if (!response.ok) throw new Error("Không lưu được. Thử lại.");
  }

  if (!document.getElementById("pm-matrix")) return;
  if (!map) {
    showError();
    return;
  }
  try {
    boot();
  } catch (error) {
    showError();
  }
})();
