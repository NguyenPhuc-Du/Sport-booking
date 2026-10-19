document.addEventListener("submit", (event) => {
  const form = event.target;
  const message = form.getAttribute("data-confirm");
  if (!message) return;
  if (!window.confirm(message)) event.preventDefault();
  else
    form.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
});
