(function () {
  var IDLE_HINT = "Bấm các ô trống liền nhau trên cùng một sân. 08 → 09 → 10 được, 08 → 10 thì không.";
  var modal = document.getElementById("bookingModal");
  var walkIn = document.getElementById("walkInModal");
  var pickBar = document.getElementById("pickBar");
  if (!modal || !pickBar) return;

  var fields = {};
  modal.querySelectorAll("[data-field]").forEach(function (el) {
    fields[el.getAttribute("data-field")] = el;
  });

  var lastFocus = null;
  var checkInForm = document.getElementById("checkInForm");
  var checkInCode = checkInForm.querySelector("[name=code]");
  var cancelCode = document.querySelector("#cancelForm [name=code]");
  var walkInForm = document.getElementById("walkInForm");
  var openWalkInBtn = document.getElementById("openWalkIn");
  var pickTitle = document.getElementById("pickTitle");
  var pickHint = document.getElementById("pickHint");
  var pickBook = document.getElementById("pickBook");
  var pickClear = document.getElementById("pickClear");
  var allowed = pickBar.dataset.allowed === "true";
  var priceRules = [];
  var priceNode = document.getElementById("walkInPriceRules");
  if (priceNode) {
    try { priceRules = JSON.parse(priceNode.textContent || "[]"); } catch (e) { priceRules = []; }
  }

  var selected = [];
  var hintLock = false;
  var drag = null;
  var suppressClick = false;
  var originX = 0;
  var originY = 0;
  var lastX = 0;
  var lastY = 0;

  function show(value) {
    return value ? value : "—";
  }

  function pad(hour) {
    return String(hour).padStart(2, "0");
  }

  function toMin(value) {
    var parts = String(value || "").slice(0, 5).split(":");
    return Number(parts[0]) * 60 + Number(parts[1] || 0);
  }

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + "đ";
  }

  function lockBody() {
    var open = modal.classList.contains("is-open") || (walkIn && walkIn.classList.contains("is-open"));
    document.body.classList.toggle("bk-modal-open", open);
  }

  function isContiguous(hours) {
    for (var i = 1; i < hours.length; i += 1) {
      if (hours[i] !== hours[i - 1] + 1) return false;
    }
    return true;
  }

  function sortedHours() {
    return selected.map(function (item) { return item.hour; }).sort(function (a, b) { return a - b; });
  }

  function selectionRange() {
    if (!selected.length) return null;
    var court = selected[0].court;
    if (selected.some(function (item) { return item.court !== court; })) return null;
    var hours = sortedHours();
    if (!isContiguous(hours)) return null;
    return {
      court: court,
      label: selected[0].label,
      start: pad(hours[0]) + ":00",
      end: pad(hours[hours.length - 1] + 1) + ":00",
      count: hours.length,
    };
  }

  function hourCovered(courtId, hour) {
    var minute = hour * 60;
    return priceRules.some(function (rule) {
      return rule.courtId === courtId && minute >= toMin(rule.timeStart) && minute < toMin(rule.timeEnd);
    });
  }

  function quoteSelection(range) {
    var rules = priceRules.filter(function (rule) { return rule.courtId === range.court; });
    if (!rules.length) return { ok: false, total: 0, message: "Sân chưa có bảng giá cho ngày này" };
    var total = 0;
    for (var minute = toMin(range.start); minute < toMin(range.end); minute += 60) {
      var matched = null;
      for (var i = 0; i < rules.length; i += 1) {
        if (minute >= toMin(rules[i].timeStart) && minute < toMin(rules[i].timeEnd)) {
          matched = rules[i];
          break;
        }
      }
      if (!matched) return { ok: false, total: 0, message: "Khung giờ chưa có bảng giá" };
      total += Number(matched.pricePerHour) || 0;
    }
    return { ok: true, total: total, message: "Theo bảng giá: " + formatMoney(total) };
  }

  function setError(message) {
    hintLock = true;
    pickBar.classList.add("is-bad");
    pickBar.classList.remove("is-warn");
    if (pickHint) pickHint.textContent = message;
  }

  function paint() {
    var on = {};
    selected.forEach(function (item) {
      on[item.court + ":" + pad(item.hour)] = true;
    });
    document.querySelectorAll(".sz-hour-pick").forEach(function (btn) {
      var active = !!on[btn.dataset.court + ":" + btn.dataset.hour];
      btn.classList.toggle("is-on", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function refreshBar() {
    paint();
    var range = selectionRange();
    var priced = range ? quoteSelection(range) : null;
    if (pickBook) pickBook.disabled = !(priced && priced.ok);
    if (!range) {
      if (pickTitle) pickTitle.textContent = "Chọn ô giờ trên sơ đồ";
      if (!hintLock && pickHint) {
        pickBar.classList.remove("is-bad");
        pickHint.textContent = allowed ? IDLE_HINT : (pickBar.dataset.reason || "Không thể đặt sân cho ngày này.");
      }
      return;
    }
    if (pickTitle) pickTitle.textContent = range.label + " · " + range.start + " – " + range.end;
    if (hintLock) return;
    pickBar.classList.toggle("is-bad", !priced.ok);
    if (pickHint) {
      pickHint.textContent = priced.ok
        ? "Đã chọn " + range.count + " giờ liên tiếp (" + range.start + "–" + range.end + ")."
        : priced.message;
    }
  }

  function flash(btn) {
    if (!btn) return;
    btn.classList.remove("is-reject");
    void btn.offsetWidth;
    btn.classList.add("is-reject");
    setTimeout(function () { btn.classList.remove("is-reject"); }, 450);
  }

  function vietnamNow() {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    var get = function (type) {
      var found = parts.find(function (part) { return part.type === type; });
      return found ? found.value : "";
    };
    return {
      date: get("year") + "-" + get("month") + "-" + get("day"),
      time: get("hour") + ":" + get("minute"),
    };
  }

  function earliestHour() {
    var dateInput = document.getElementById("bookingDate");
    var date = dateInput ? dateInput.value : "";
    var now = vietnamNow();
    if (date > now.date) return 6;
    if (date < now.date) return 24;
    var hour = Number(now.time.slice(0, 2));
    if (!Number.isFinite(hour) || hour < 6) return 6;
    return hour + 1;
  }

  function hourHasStarted(hour) {
    return hour < earliestHour();
  }

  function pastSlotMessage() {
    var next = earliestHour();
    if (next > 21) return "Đã hết khung giờ có thể đặt trong hôm nay.";
    return "Khung giờ đã qua. Chỉ được đặt từ " + pad(next) + ":00 trở đi.";
  }

  function lockStartedSlots() {
    var minHour = earliestHour();
    document.querySelectorAll(".sz-hour-pick").forEach(function (btn) {
      if (Number(btn.dataset.hour) >= minHour) return;
      btn.disabled = true;
      btn.classList.remove("is-on");
      btn.title = "Đã qua giờ";
      var cell = btn.closest(".sz-timeline-cell");
      if (!cell) return;
      cell.classList.remove("is-free");
      cell.classList.add("is-closed");
      cell.title = "Đã qua giờ";
    });
    var before = selected.length;
    selected = selected.filter(function (item) { return !hourHasStarted(item.hour); });
    if (selected.length !== before) setError(pastSlotMessage());
    refreshBar();
  }

  function addHour(court, label, hour) {
    if (hourHasStarted(hour)) {
      setError(pastSlotMessage());
      return false;
    }
    if (!selected.length) {
      selected.push({ court: court, label: label, hour: hour });
      hintLock = false;
      refreshBar();
      return true;
    }
    if (selected[0].court !== court) return false;
    if (selected.some(function (item) { return item.hour === hour; })) return true;
    var hours = sortedHours();
    var min = hours[0];
    var max = hours[hours.length - 1];
    if (hour !== min - 1 && hour !== max + 1) {
      refreshBar();
      setError("Các ô phải liền nhau, không được ngắt khoảng.");
      return false;
    }
    selected.push({ court: court, label: label, hour: hour });
    hintLock = false;
    refreshBar();
    return true;
  }

  function removeEndpoint(court, hour) {
    var hours = sortedHours();
    if (hour !== hours[0] && hour !== hours[hours.length - 1]) {
      refreshBar();
      setError("Không bỏ ô ở giữa khoảng đã chọn. Bỏ từ hai đầu hoặc bấm Bỏ chọn.");
      return false;
    }
    selected = selected.filter(function (item) {
      return !(item.court === court && item.hour === hour);
    });
    hintLock = false;
    refreshBar();
    return true;
  }

  function toggleCell(btn) {
    if (btn.disabled) return;
    var court = btn.dataset.court;
    var label = btn.dataset.label;
    var hour = Number(btn.dataset.hour);
    if (selected.length && selected[0].court !== court) {
      selected = [{ court: court, label: label, hour: hour }];
      hintLock = false;
      refreshBar();
      return;
    }
    if (selected.some(function (item) { return item.court === court && item.hour === hour; })) {
      if (!removeEndpoint(court, hour)) flash(btn);
      return;
    }
    if (!addHour(court, label, hour)) flash(btn);
  }

  function commitStart(btn) {
    if (btn.disabled) return false;
    var court = btn.dataset.court;
    var hour = Number(btn.dataset.hour);
    if (selected.length && selected[0].court !== court) selected = [];
    if (selected.some(function (item) { return item.court === court && item.hour === hour; })) return true;
    var ok = addHour(court, btn.dataset.label, hour);
    if (!ok) flash(btn);
    return ok;
  }

  function buttonsAlong(x1, y1, x2, y2) {
    var found = [];
    var last = null;
    var dist = Math.hypot(x2 - x1, y2 - y1);
    var steps = Math.max(1, Math.ceil(dist / 6));
    for (var i = 0; i <= steps; i += 1) {
      var x = x1 + ((x2 - x1) * i) / steps;
      var y = y1 + ((y2 - y1) * i) / steps;
      var el = document.elementFromPoint(x, y);
      var btn = el && el.closest ? el.closest(".sz-hour-pick") : null;
      if (btn && btn !== last) {
        found.push(btn);
        last = btn;
      }
    }
    return found;
  }

  function applyRange(range) {
    if (hourHasStarted(Number(String(range.start).slice(0, 2)))) {
      setError(pastSlotMessage());
      return false;
    }
    var priced = quoteSelection(range);
    var court = document.getElementById("walkInCourt");
    var start = document.getElementById("walkInStart");
    var end = document.getElementById("walkInEnd");
    var amount = document.getElementById("walkInAmount");
    var summary = document.getElementById("walkInSummary");
    var hint = document.getElementById("walkInPriceHint");
    if (court) court.value = range.court;
    if (start) start.value = range.start;
    if (end) end.value = range.end;
    if (summary) {
      summary.textContent = range.label + " · " + range.start + " – " + range.end + " · " + range.count + " giờ";
    }
    if (!priced.ok) {
      if (amount) amount.value = "";
      if (hint) hint.textContent = priced.message;
      setError(priced.message);
      return false;
    }
    if (amount) amount.value = String(priced.total);
    if (hint) hint.textContent = priced.message;
    return true;
  }

  function openModal(slot) {
    fields.code.textContent = show(slot.dataset.code);
    fields.customer.textContent = show(slot.dataset.customer);
    fields.phone.textContent = show(slot.dataset.phone);
    fields.court.textContent = show(slot.dataset.court);
    fields.time.textContent = show(slot.dataset.time);
    fields.amount.textContent = show(slot.dataset.amount);
    checkInCode.value = slot.dataset.code || "";
    cancelCode.value = slot.dataset.code || "";
    checkInForm.hidden = slot.dataset.status === "completed";
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockBody();
    var closeBtn = modal.querySelector(".bk-modal-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    lockBody();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openWalkIn() {
    if (!walkIn || !allowed) return;
    var range = selectionRange();
    if (!range) {
      setError("Hãy chọn các ô giờ trống liền nhau trên sơ đồ.");
      var wrap = document.querySelector(".sz-timeline-wrap");
      if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    if (!applyRange(range)) return;
    if (modal.classList.contains("is-open")) closeModal();
    walkIn.classList.add("is-open");
    walkIn.setAttribute("aria-hidden", "false");
    lockBody();
    var name = document.getElementById("walkInName");
    if (name) name.focus();
  }

  function closeWalkIn() {
    if (!walkIn) return;
    walkIn.classList.remove("is-open");
    walkIn.setAttribute("aria-hidden", "true");
    if (walkInForm) walkInForm.reset();
    var summary = document.getElementById("walkInSummary");
    if (summary) summary.textContent = "Chọn ô giờ trên sơ đồ trước khi đặt.";
    var hint = document.getElementById("walkInPriceHint");
    if (hint) hint.textContent = "";
    lockBody();
    if (openWalkInBtn) openWalkInBtn.focus();
  }

  document.querySelectorAll(".sz-hour-pick").forEach(function (btn) {
    var hour = Number(btn.dataset.hour);
    if (!hourCovered(btn.dataset.court, hour)) {
      btn.disabled = true;
      btn.classList.add("is-unpriced");
      btn.title = "Chưa có bảng giá";
    }
  });

  if (!allowed) {
    pickBar.classList.add("is-warn");
    if (pickHint) pickHint.textContent = pickBar.dataset.reason || "Không thể đặt sân cho ngày này.";
  }

  document.querySelectorAll(".sz-slot").forEach(function (slot) {
    slot.addEventListener("click", function () { openModal(slot); });
  });

  modal.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", closeModal);
  });

  if (openWalkInBtn) openWalkInBtn.addEventListener("click", openWalkIn);
  if (pickBook) pickBook.addEventListener("click", openWalkIn);
  if (pickClear) {
    pickClear.addEventListener("click", function () {
      selected = [];
      hintLock = false;
      refreshBar();
    });
  }

  if (walkIn) {
    walkIn.querySelectorAll("[data-close-walkin]").forEach(function (el) {
      el.addEventListener("click", closeWalkIn);
    });
  }

  if (walkInForm) {
    walkInForm.addEventListener("submit", function (event) {
      var range = selectionRange();
      if (!range || !applyRange(range)) event.preventDefault();
    });
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest(".sz-hour-pick");
    if (!btn) return;
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    toggleCell(btn);
  });

  document.addEventListener("pointerdown", function (event) {
    var btn = event.target.closest && event.target.closest(".sz-hour-pick");
    if (!btn || btn.disabled || event.button !== 0) return;
    drag = { startBtn: btn, moved: false, blocked: false };
    originX = lastX = event.clientX;
    originY = lastY = event.clientY;
  });

  document.addEventListener("pointermove", function (event) {
    if (!drag) return;
    var dist = Math.hypot(event.clientX - originX, event.clientY - originY);
    var path = buttonsAlong(lastX, lastY, event.clientX, event.clientY);
    lastX = event.clientX;
    lastY = event.clientY;
    var enteredOther = path.some(function (btn) { return btn !== drag.startBtn; });
    if (!drag.moved) {
      if (dist < 6 && !enteredOther) return;
      drag.moved = true;
      document.body.classList.add("is-slot-drag");
      if (!commitStart(drag.startBtn)) {
        drag.blocked = true;
        return;
      }
    }
    if (drag.blocked) return;
    event.preventDefault();
    for (var i = 0; i < path.length; i += 1) {
      var btn = path[i];
      if (btn === drag.startBtn) continue;
      if (btn.disabled) {
        flash(btn);
        setError("Ô này chưa có bảng giá, không chọn nhảy qua được.");
        drag.blocked = true;
        return;
      }
      if (btn.dataset.court !== drag.startBtn.dataset.court) {
        flash(btn);
        setError("Chỉ chọn các ô trên cùng một sân.");
        drag.blocked = true;
        return;
      }
      if (!addHour(btn.dataset.court, btn.dataset.label, Number(btn.dataset.hour))) {
        flash(btn);
        drag.blocked = true;
        return;
      }
    }
  }, { passive: false });

  function endDrag() {
    if (drag && drag.moved) {
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
    }
    drag = null;
    document.body.classList.remove("is-slot-drag");
  }

  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (walkIn && walkIn.classList.contains("is-open")) closeWalkIn();
    else if (modal.classList.contains("is-open")) closeModal();
  });

  lockStartedSlots();
  setInterval(lockStartedSlots, 30000);
  refreshBar();
})();
