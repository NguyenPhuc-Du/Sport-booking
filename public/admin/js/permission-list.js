(function () {
  const map = window.PermissionMap;
  const retry = document.getElementById("pm-retry");
  if (retry) retry.addEventListener("click", () => location.reload());

  // Hiện ô lỗi khi không đọc được dữ liệu quyền. Gọi khi JSON hỏng hoặc thiếu hàm.
  function showError() {
    document.querySelectorAll(".pm-skel").forEach((node) => node.remove());
    const box = document.getElementById("pm-error");
    if (box) box.hidden = false;
  }

  // Hiện một câu ngắn rồi tự mất. Vào: nội dung, "ok" hoặc "error". Gọi sau khi lưu hoặc khi thiếu tên.
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

  // Đọc JSON nhúng trong trang. Ra: object payload. Gọi một lần lúc mở trang chi tiết vai trò.
  function readPayload() {
    const node = document.getElementById("pm-data");
    if (!node) throw new Error("Thiếu dữ liệu quyền");
    const data = JSON.parse(node.textContent || "");
    if (!data || !Array.isArray(data.permissions)) throw new Error("Dữ liệu quyền không đúng");
    return data;
  }

  // Gắn trạng thái tick một phần cho checkbox cha. Vào: input và kết quả triState.
  function setTri(input, tri) {
    if (!input) return;
    input.checked = tri.checked;
    input.indeterminate = tri.indeterminate;
  }

  // Một dòng trong hộp xác nhận. Vào: câu chữ, lớp màu. Ra: thẻ li.
  function diffLine(text, kind) {
    const line = document.createElement("li");
    line.className = kind;
    line.textContent = text;
    return line;
  }

  // Ô tìm quyền. Gọi khi dựng thanh công cụ. Mỗi lần gõ thì vẽ lại danh sách.
  function searchBox(state, onPaint) {
    const input = document.createElement("input");
    input.className = "sz-input pm-search";
    input.type = "search";
    input.placeholder = "Tìm quyền";
    input.setAttribute("aria-label", "Tìm quyền");
    input.addEventListener("input", () => {
      state.query = input.value;
      onPaint();
    });
    return input;
  }

  // Một dòng quyền: ô chọn, tên đầy đủ, một câu mô tả, nhãn cẩn trọng nếu có.
  function permissionRow(item, readOnly) {
    const label = document.createElement("label");
    label.className = item.dangerous ? "pr-row is-danger" : "pr-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = readOnly;
    input.checked = item.checked;
    input.setAttribute("data-code", item.code);
    input.setAttribute("aria-label", item.label);
    item.input = input;
    const name = document.createElement("span");
    name.className = "pr-name";
    name.textContent = item.label;
    const sentence = document.createElement("span");
    sentence.className = "pr-sentence";
    sentence.textContent = item.full && item.full !== item.label ? item.full : item.reason || "";
    label.append(input, name);
    if (sentence.textContent) label.append(sentence);
    if (item.dangerous) {
      const caution = document.createElement("span");
      caution.className = "pr-caution";
      caution.textContent = "Nhạy cảm";
      if (item.reason) caution.title = item.reason;
      label.append(caution);
    }
    return label;
  }

  // Khối một nhóm quyền, có ô "Chọn tất cả". Ra: section. Gọi cho từng nhóm lúc vẽ.
  function groupBlock(mod, readOnly) {
    const section = document.createElement("section");
    section.className = "pr-group";
    const head = document.createElement("header");
    const title = document.createElement("h2");
    title.textContent = mod.label;
    const all = document.createElement("label");
    all.className = "pr-all";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = readOnly || map.permissionsOf(mod).length === 0;
    input.setAttribute("data-module", mod.key);
    input.setAttribute("aria-label", `Chọn tất cả quyền ${mod.label}`);
    const caption = document.createElement("span");
    caption.textContent = "Chọn tất cả";
    all.append(input, caption);
    head.append(title, all);
    const list = document.createElement("div");
    list.className = "pr-rows";
    section.append(head, list);
    mod.block = section;
    mod.list = list;
    mod.allInput = input;
    return section;
  }

  // Vẽ các dòng còn khớp chữ tìm. Ẩn nhóm nếu không còn dòng nào.
  function paintGroup(mod, query, readOnly) {
    mod.list.replaceChildren();
    const visible = map.permissionsOf(mod).filter((item) => map.itemMatches(item, query));
    visible.forEach((item) => {
      if (item.input) item.input.checked = item.checked;
      mod.list.append(permissionRow(item, readOnly));
    });
    mod.block.hidden = visible.length === 0;
    setTri(mod.allInput, map.triState(map.permissionsOf(mod)));
    return visible.length;
  }

  // Câu menu và số quyền đã cấp. Gọi mỗi lần tick.
  function paintMeta(state) {
    const counts = map.countGranted(state.modules);
    const count = document.getElementById("pm-count");
    if (count) count.textContent = `${counts.granted}/${counts.total}`;
    const menu = document.getElementById("pm-menu");
    if (menu) menu.textContent = map.menuLine(state.modules, state.menu);
    return counts;
  }

  // Gửi formurlencoded tới route có sẵn. Vào: url và object field. Ném lỗi tiếng Việt nếu server từ chối.
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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html",
          "x-csrf-token": (document.querySelector('meta[name="csrf-token"]') || {}).content || "",
        },
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

  // Các câu đổi tên hoặc mô tả. Ra: mảng chuỗi. Gọi khi đếm thay đổi chưa lưu.
  function profileNotes(state, nameInput, descInput) {
    if (state.nameLocked || !nameInput || !descInput) return [];
    const notes = [];
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    if (name !== state.baselineName) notes.push(`Tên: ${state.baselineName || "—"} → ${name || "—"}`);
    if (desc !== state.baselineDesc) notes.push(`Mô tả: ${state.baselineDesc || "—"} → ${desc || "—"}`);
    return notes;
  }

  // Mở trang chi tiết vai trò: đọc dữ liệu, vẽ nhóm, lưu khi có thay đổi.
  function boot() {
    const pending = sessionStorage.getItem("pm-toast");
    if (pending) {
      sessionStorage.removeItem("pm-toast");
      showToast(pending, "ok");
    }
    const data = readPayload();
    const nameInput = document.getElementById("pm-name");
    const descInput = document.getElementById("pm-desc");
    const modules = map.buildModules(data.permissions, data.groupOrder);
    const state = {
      roleId: data.roleId,
      readOnly: Boolean(data.readOnly),
      nameLocked: Boolean(data.nameLocked),
      menu: data.menu || [],
      modules,
      baseline: map.snapshot(modules),
      baselineCodes: map.selectedCodes(modules),
      baselineName: nameInput ? nameInput.value.trim() : "",
      baselineDesc: descInput ? descInput.value.trim() : "",
      query: "",
      saving: false,
      leaving: false,
    };
    document.querySelectorAll(".pm-skel").forEach((node) => node.remove());
    const host = document.getElementById("pm-list");
    const tools = document.getElementById("pm-tools");
    const empty = document.getElementById("pm-empty");
    modules.forEach((mod) => host.append(groupBlock(mod, state.readOnly)));

    const save = {
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

    function permissionDiff() {
      if (state.readOnly) return { added: [], removed: [] };
      return map.diffCodes(state.baselineCodes, map.selectedCodes(state.modules));
    }

    function dirtyCount() {
      const diff = permissionDiff();
      return diff.added.length + diff.removed.length + profileNotes(state, nameInput, descInput).length;
    }

    function paint() {
      let shown = 0;
      state.modules.forEach((mod) => {
        shown += paintGroup(mod, state.query, state.readOnly);
      });
      if (empty) empty.hidden = shown !== 0;
      paintMeta(state);
      const count = dirtyCount();
      save.bar.hidden = count === 0;
      save.text.textContent = `Có ${count} thay đổi chưa lưu`;
    }

    if (tools) tools.append(searchBox(state, paint));
    host.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.disabled) return;
      const code = input.getAttribute("data-code");
      const moduleKey = input.getAttribute("data-module");
      if (code) map.setChecked(state.modules, code, input.checked);
      else if (moduleKey) {
        const mod = state.modules.find((item) => item.key === moduleKey);
        if (mod) map.setModuleChecked(mod, input.checked);
      }
      paint();
    });
    if (nameInput) nameInput.addEventListener("input", paint);
    if (descInput) descInput.addEventListener("input", paint);

    function openConfirm() {
      if (dirtyCount() === 0 || save.dialog.open) return;
      if (!state.nameLocked && nameInput && !nameInput.value.trim()) {
        showToast("Nhập tên vai trò", "error");
        nameInput.focus();
        return;
      }
      const diff = permissionDiff();
      save.lead.textContent = diff.added.length || diff.removed.length
        ? "Quyền thêm màu xanh, quyền gỡ màu đỏ. Người đang giữ vai trò này phải đăng nhập lại."
        : "Lưu tên và mô tả của vai trò.";
      save.body.replaceChildren();
      profileNotes(state, nameInput, descInput).forEach((text) => save.body.append(diffLine(text, "is-add")));
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
        if (profileNotes(state, nameInput, descInput).length) {
          await postForm(`/admin/roles/${state.roleId}`, {
            name: nameInput.value.trim(),
            description: descInput.value.trim(),
          });
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

    save.revert.addEventListener("click", () => {
      map.restore(state.modules, state.baseline);
      if (nameInput) nameInput.value = state.baselineName;
      if (descInput) descInput.value = state.baselineDesc;
      paint();
    });
    save.save.addEventListener("click", openConfirm);
    save.confirm.addEventListener("click", store);
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirtyCount() > 0) openConfirm();
      }
    });
    window.addEventListener("beforeunload", (event) => {
      if (state.leaving || dirtyCount() === 0) return;
      event.preventDefault();
      event.returnValue = "";
    });
    paint();
  }

  if (!document.getElementById("pm-list")) return;
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
