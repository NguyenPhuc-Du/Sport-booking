(function () {
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

  document.querySelectorAll("[data-open-pass]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById("modal-pass");
      if (!dialog) return;
      dialog.querySelector("form").action = button.getAttribute("data-action");
      const name = dialog.querySelector("[data-pass-name]");
      if (name) name.textContent = button.getAttribute("data-name") || "";
      dialog.showModal();
    });
  });
  document.querySelectorAll("[data-open-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById("modal-delete");
      if (!dialog) return;
      dialog.querySelector("form").action = button.getAttribute("data-action");
      const name = dialog.querySelector("[data-delete-name]");
      if (name) name.textContent = button.getAttribute("data-name") || "";
      dialog.showModal();
    });
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal]")) {
      const dialog = event.target.closest("dialog");
      if (dialog) dialog.close();
    }
    if (event.target.closest("[data-toggle-pass]")) {
      const dialog = event.target.closest("dialog");
      dialog.querySelectorAll("input").forEach((input) => {
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
