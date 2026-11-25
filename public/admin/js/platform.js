function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.open) return;
  if (dialog.parentElement !== document.body) document.body.appendChild(dialog);
  dialog.showModal();
}

document.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open]");
  if (openButton) {
    openDialog(openButton.getAttribute("data-open"));
    return;
  }

  if (event.target instanceof HTMLDialogElement) {
    const rect = event.target.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) event.target.close();
    return;
  }

  const closeButton = event.target.closest("[data-close]");
  if (closeButton) {
    const dialog = closeButton.closest("dialog");
    if (dialog) dialog.close();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  const message = form.getAttribute("data-confirm");
  if (!message) return;
  if (!window.confirm(message)) event.preventDefault();
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || event.defaultPrevented) return;
  const button = form.querySelector("button[type='submit']");
  if (!button) return;
  button.disabled = true;
  button.textContent = "Đang lưu...";
});

document.addEventListener("click", (event) => {
  const help = event.target.closest(".pm-help");
  if (!help) return;
  const tip = document.getElementById(help.getAttribute("aria-controls"));
  if (!tip) return;
  const willOpen = tip.hidden;
  document.querySelectorAll(".pm-tip").forEach((item) => {
    item.hidden = true;
  });
  document.querySelectorAll(".pm-help").forEach((item) => item.setAttribute("aria-expanded", "false"));
  tip.hidden = !willOpen;
  help.setAttribute("aria-expanded", willOpen ? "true" : "false");
});

document.addEventListener("change", (event) => {
  const box = event.target;
  if (!(box instanceof HTMLInputElement)) return;
  const group = box.getAttribute("data-check-group");
  if (!group) return;
  document.querySelectorAll(`input[data-group="${group}"]`).forEach((item) => {
    if (!item.disabled) item.checked = box.checked;
  });
});
