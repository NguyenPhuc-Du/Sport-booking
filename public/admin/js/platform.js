document.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open]");
  if (openButton) {
    const dialog = document.getElementById(
      openButton.getAttribute("data-open"),
    );
    if (dialog) dialog.showModal();
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
