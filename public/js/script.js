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
//upload ảnh
const uploadImage = document.querySelector("[upload-image]");

if (uploadImage) {
  const uploadImInput = document.querySelector("[upload-image-input]");
  const uploadImPr = document.querySelector("[upload-image-preview]");
  uploadImInput.addEventListener("change", (e) => {
    console.log(e);
    const file = e.target.files[0];
    console.log(file);
    if (file) {
      uploadImPr.src = URL.createObjectURL(file);
    }
  });
}
//end up load ảnh
