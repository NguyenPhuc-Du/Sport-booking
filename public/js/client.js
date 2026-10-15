(() => {
  const activateGroup = (root, itemSel) => {
    if (!root) return;
    const items = root.querySelectorAll(itemSel);
    items.forEach((btn) => {
      btn.addEventListener("click", () => {
        items.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  };

  activateGroup(document.getElementById("sportTabs"), ".sz-sport-tab");
  activateGroup(document.getElementById("amenityList"), ".sz-amenity-chip");
  activateGroup(document.getElementById("dateRow"), ".sz-date-card");
  activateGroup(document.getElementById("courtFilters"), ".sz-amenity-chip");

  const payList = document.getElementById("payList");
  if (payList) {
    payList.querySelectorAll(".sz-pay-item").forEach((item) => {
      item.addEventListener("click", () => {
        payList.querySelectorAll(".sz-pay-item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        const radio = item.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });
  }

  const slotGrid = document.getElementById("slotGrid");
  const selectedSlotText = document.getElementById("selectedSlotText");
  const selectedPrice = document.getElementById("selectedPrice");
  const confirmBooking = document.getElementById("confirmBooking");

  if (slotGrid) {
    slotGrid.querySelectorAll(".sz-slot:not(.is-locked)").forEach((slot) => {
      slot.addEventListener("click", () => {
        slotGrid.querySelectorAll(".sz-slot").forEach((s) => s.classList.remove("selected"));
        slot.classList.add("selected");
        const time = slot.querySelector("strong")?.textContent || "";
        const price = slot.dataset.price || "";
        if (selectedSlotText) selectedSlotText.textContent = `Khung giờ ${time}`;
        if (selectedPrice) selectedPrice.textContent = price;
      });
    });
  }

  if (confirmBooking) {
    confirmBooking.addEventListener("click", () => {
      const selected = slotGrid?.querySelector(".sz-slot.selected");
      if (!selected) {
        alert("Vui lòng chọn một khung giờ còn trống.");
        return;
      }
      window.location.href = "/checkout";
    });
  }

  const checkoutConfirm = document.getElementById("checkoutConfirm");
  if (checkoutConfirm) {
    checkoutConfirm.addEventListener("click", () => {
      alert("Đặt sân thành công (demo UI). Bạn có thể xem lịch sử trong trang hồ sơ.");
      window.location.href = "/profile?tab=bookings";
    });
  }

  const bindAvatarPreview = (inputId, imgId, hiddenId) => {
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    const hidden = hiddenId ? document.getElementById(hiddenId) : null;
    if (!input || !img) return;
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      img.src = url;
      if (hidden) hidden.value = url;
    });
  };

  bindAvatarPreview("userAvatarInput", "userAvatarPreview");
  bindAvatarPreview("settingsAvatarInput", "settingsAvatarPreview", "settingsAvatarUrl");
  bindAvatarPreview("settingsAvatarInput", "userAvatarPreview", "settingsAvatarUrl");

  const formatVnd = (n) =>
    `${Math.max(0, Number(n) || 0).toLocaleString("vi-VN")}đ`;

  const amountGrid = document.getElementById("amountGrid");
  const customAmount = document.getElementById("customAmount");
  const topUpAmount = document.getElementById("topUpAmount");
  const summaryAmount = document.getElementById("summaryAmount");
  const summaryPay = document.getElementById("summaryPay");

  const setTopUpAmount = (value, fromCustom = false) => {
    const amount = Number(value) || 0;
    if (topUpAmount) topUpAmount.value = String(amount);
    if (summaryAmount) summaryAmount.textContent = formatVnd(amount);
    if (summaryPay) summaryPay.textContent = formatVnd(amount);
    if (!fromCustom && customAmount) customAmount.value = amount ? String(amount) : "";
    if (amountGrid) {
      amountGrid.querySelectorAll(".sz-amount-btn").forEach((btn) => {
        btn.classList.toggle("active", Number(btn.dataset.amount) === amount);
      });
    }
  };

  if (amountGrid) {
    amountGrid.querySelectorAll(".sz-amount-btn").forEach((btn) => {
      btn.addEventListener("click", () => setTopUpAmount(btn.dataset.amount));
    });
    const preset = amountGrid.querySelector('[data-amount="200000"]') || amountGrid.querySelector(".sz-amount-btn");
    if (preset) setTopUpAmount(preset.dataset.amount);
  }

  if (customAmount) {
    customAmount.addEventListener("input", () => setTopUpAmount(customAmount.value, true));
  }

  const topUpForm = document.getElementById("topUpForm");
  if (topUpForm) {
    topUpForm.addEventListener("submit", (e) => {
      const amount = Number(topUpAmount?.value || 0);
      if (amount < 50000) {
        e.preventDefault();
        alert("Số tiền nạp tối thiểu là 50.000đ.");
      }
    });
  }
})();
