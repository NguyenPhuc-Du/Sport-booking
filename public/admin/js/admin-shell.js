(function () {
  document.querySelectorAll("[show-alert]").forEach((alertEl) => {
    const time = Number(alertEl.getAttribute("data-time")) || 4000;
    const hide = () => {
      alertEl.classList.add("alert-hide");
      setTimeout(() => alertEl.remove(), 220);
    };
    const timer = setTimeout(hide, time);
    const close = alertEl.querySelector("[close-alert]");
    if (close) close.addEventListener("click", () => {
      clearTimeout(timer);
      hide();
    });
  });

  document.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-href]");
    if (!row || event.target.closest("a, button, summary, input, select, label, form")) return;
    window.location.href = row.getAttribute("data-href");
  });

  document.addEventListener("keydown", (event) => {
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const rows = [...document.querySelectorAll("tr[data-href]")];
    const current = rows.findIndex((row) => row.classList.contains("is-chon"));
    if (event.key === "Escape" && current >= 0) {
      window.location.href = rows[current].getAttribute("data-href");
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && rows.length) {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? Math.min(rows.length - 1, current + 1) : Math.max(0, current - 1);
      if (rows[next]) window.location.href = rows[next].getAttribute("data-href");
    }
  });

  const body = document.body;
  const key = "sz-admin-nav";
  if (localStorage.getItem(key) === "collapsed") body.classList.add("is-collapsed");

  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-nav]");
    if (open) body.classList.toggle("is-nav-open");
    const fold = event.target.closest("[data-collapse-nav]");
    if (fold) {
      body.classList.toggle("is-collapsed");
      localStorage.setItem(key, body.classList.contains("is-collapsed") ? "collapsed" : "open");
    }
    const parent = event.target.closest(".ad-parent");
    if (parent) parent.parentElement.classList.toggle("is-closed");
  });

  document.addEventListener("toggle", (event) => {
    const details = event.target;
    if (!details.classList || !details.classList.contains("ad-more")) return;
    const menu = details.querySelector(".ad-menu");
    if (!details.open) return;
    document.querySelectorAll("details.ad-more[open]").forEach((item) => {
      if (item !== details) item.open = false;
    });
    if (!menu) return;
    const rect = details.querySelector("summary").getBoundingClientRect();
    const width = 200;
    let left = rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    let top = rect.bottom + 6;
    if (top + 150 > window.innerHeight) top = Math.max(8, rect.top - 150);
    menu.style.position = "fixed";
    menu.style.width = `${width}px`;
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.zIndex = "50";
  }, true);
  window.addEventListener("scroll", () => {
    document.querySelectorAll("details.ad-more[open]").forEach((item) => {
      item.open = false;
    });
  }, true);

  document.querySelectorAll("[data-open-pass]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById("modal-pass");
      if (!dialog) return;
      dialog.querySelector("form").action = button.getAttribute("data-action");
      const name = dialog.querySelector("[data-pass-name]");
      if (name) name.textContent = button.getAttribute("data-name") || "";
      const next = dialog.querySelector("[name=next]");
      if (next) next.value = button.getAttribute("data-next") || "";
      dialog.showModal();
    });
  });
  document.querySelectorAll("[data-open-lock]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById("modal-lock");
      if (dialog) dialog.showModal();
    });
  });
  document.querySelectorAll("[data-open-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById("modal-delete");
      if (!dialog) return;
      dialog.querySelector("form").action = button.getAttribute("data-action");
      const name = dialog.querySelector("[data-delete-name]");
      if (name) name.textContent = button.getAttribute("data-name") || "";
      const next = dialog.querySelector("[name=next]");
      if (next) next.value = button.getAttribute("data-next") || "";
      dialog.showModal();
    });
  });
  document.addEventListener("click", async (event) => {
    const copy = event.target.closest("[data-copy]");
    if (!copy || !navigator.clipboard) return;
    if (!copy.getAttribute("data-copy-label")) {
      copy.setAttribute("data-copy-label", copy.getAttribute("aria-label") || "Sao chép");
    }
    await navigator.clipboard.writeText(copy.getAttribute("data-copy") || "");
    copy.setAttribute("data-copied", "1");
    copy.setAttribute("aria-label", "Đã sao chép");
    setTimeout(() => {
      copy.removeAttribute("data-copied");
      copy.setAttribute("aria-label", copy.getAttribute("data-copy-label") || "Sao chép");
    }, 1500);
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal]")) {
      const dialog = event.target.closest("dialog");
      if (dialog) dialog.close();
    }
    if (event.target.closest("[data-toggle-pass]")) {
      const dialog = event.target.closest("dialog");
      dialog.querySelectorAll("[name=password], [name=confirm]").forEach((input) => {
        input.type = input.type === "password" ? "text" : "password";
      });
    }
    if (event.target.closest("[data-random-pass]")) {
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      let next = "";
      for (let i = 0; i < 10; i += 1) next += alphabet[Math.floor(Math.random() * alphabet.length)];
      const dialog = event.target.closest("dialog");
      dialog.querySelector("[name=password]").value = next;
      dialog.querySelector("[name=confirm]").value = next;
    }
  });

  const token = document.querySelector('meta[name="csrf-token"]');
  document.querySelectorAll('form[method="post"]').forEach((form) => {
    if (!token || form.querySelector("[name=_csrf]")) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "_csrf";
    input.value = token.content;
    form.append(input);
  });
})();
