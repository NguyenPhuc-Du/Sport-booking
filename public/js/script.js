(function () {
  function hideAlert(el) {
    el.classList.add("alert-hide");
    setTimeout(function () {
      el.remove();
    }, 250);
  }

  document.querySelectorAll("[show-alert]").forEach(function (alertEl) {
    var time = parseInt(alertEl.dataset.time, 10) || 5000;

    var timer = setTimeout(function () {
      hideAlert(alertEl);
    }, time);

    var closeBtn = alertEl.querySelector("[close-alert]");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        clearTimeout(timer);
        hideAlert(alertEl);
      });
    }
  });
})();

const uploadImage = document.querySelector("[upload-image]");
if (uploadImage) {
  const uploadImInput = document.querySelector("[upload-image-input]");
  const uploadImPr = document.querySelector("[upload-image-preview]");
  if (uploadImInput && uploadImPr) {
    uploadImInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        uploadImPr.src = URL.createObjectURL(file);
      }
    });
  }
}

const buttonPage = document.querySelectorAll("[button-page]");
if (buttonPage.length) {
  const url = new URL(window.location.href);
  buttonPage.forEach((button) => {
    button.addEventListener("click", () => {
      const buttonvalue = button.getAttribute("button-page");
      url.searchParams.set("page", buttonvalue || "1");
      window.location.href = url.href;
    });
  });
}
