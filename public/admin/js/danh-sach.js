(function () {
  const token = document.querySelector('meta[name="csrf-token"]');
  const tim = document.getElementById("tim-khach");
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (!tim) return;
    event.preventDefault();
    tim.focus();
  });

  document.addEventListener("click", (event) => {
    const pop = document.querySelector("details.ad-filter-pop[open]");
    if (pop && !pop.contains(event.target)) pop.open = false;
    const exp = document.querySelector("details.ad-export[open]");
    if (exp && !exp.contains(event.target)) exp.open = false;
  });

  const size = document.querySelector("[data-page-size]");
  if (size) {
    size.addEventListener("change", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("pageSize", size.value);
      url.searchParams.delete("page");
      window.location.href = url.toString();
    });
  }

  const boxes = () => [...document.querySelectorAll(".ad-list tbody .ad-check")];
  const bulk = document.getElementById("hang-loat");
  const dem = document.querySelector("[data-so-chon]");
  const xuat = document.querySelector("[data-bulk-export]");
  function capNhat() {
    if (!bulk) return;
    const chon = boxes().filter((box) => box.checked);
    if (bulk) bulk.classList.toggle("is-on", chon.length > 0);
    if (dem) dem.textContent = String(chon.length);
    bulk.querySelectorAll("input[name=ids]").forEach((input) => input.remove());
    chon.forEach((box) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "ids";
      input.value = box.value;
      bulk.append(input);
    });
    if (xuat) {
      const url = new URL(xuat.getAttribute("href"), window.location.origin);
      if (chon.length) url.searchParams.set("ids", chon.map((box) => box.value).join(","));
      else url.searchParams.delete("ids");
      xuat.href = url.pathname + url.search;
    }
  }
  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-check-all]")) {
      boxes().forEach((box) => { box.checked = event.target.checked; });
    }
    if (event.target.classList.contains("ad-check")) capNhat();
  });

  const mo = document.querySelector("[data-open-import]");
  const dialog = document.getElementById("modal-nhap");
  if (mo && dialog) mo.addEventListener("click", () => dialog.showModal());
  const drop = document.querySelector("[data-drop]");
  if (drop && dialog) {
    const input = drop.querySelector("input[type=file]");
    const ten = drop.querySelector("[data-file-name]");
    const xem = dialog.querySelector("[data-preview]");
    const form = dialog.querySelector("form");
    const gan = (file) => {
      if (!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      ten.textContent = file.name;
      const body = new FormData();
      body.append("tep", file);
      if (token) body.append("_csrf", token.content);
      fetch(`${form.action}${form.action.includes("?") ? "&" : "?"}xem=1`, {
        method: "POST",
        body,
        headers: token ? { "x-csrf-token": token.content } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          const thoat = (value) => String(value || "").replace(/[&<>"']/g, (kyTu) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
          }[kyTu]));
          const dong = data.dong || [];
          xem.hidden = false;
          xem.innerHTML = dong.length
            ? `<table><tbody>${dong.map((item) => `<tr><td>${thoat(item.so)}</td><td>${thoat(item.fullName)}</td><td>${thoat(item.email)}</td><td>${thoat(item.loi || "Sẵn sàng")}</td></tr>`).join("")}</tbody></table>`
            : "<p>File không có dòng dữ liệu.</p>";
        })
        .catch(() => {
          xem.hidden = false;
          xem.textContent = "Không xem trước được file.";
        });
    };
    ["dragenter", "dragover"].forEach((name) => drop.addEventListener(name, (event) => {
      event.preventDefault();
      drop.classList.add("is-over");
    }));
    ["dragleave", "drop"].forEach((name) => drop.addEventListener(name, (event) => {
      event.preventDefault();
      drop.classList.remove("is-over");
    }));
    drop.addEventListener("drop", (event) => gan(event.dataTransfer.files[0]));
    input.addEventListener("change", () => gan(input.files[0]));
  }
})();
