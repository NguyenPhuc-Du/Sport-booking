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
