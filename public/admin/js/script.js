(() => {
  const readJson = (el, key) => {
    if (!el || !el.dataset[key]) return [];
    try {
      const parsed = JSON.parse(el.dataset[key]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const activateGroup = (root, itemSel) => {
    if (!root) return;
    const items = root.querySelectorAll(itemSel);
    items.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (
          btn.tagName === "A" &&
          btn.getAttribute("href") &&
          btn.getAttribute("href") !== "#"
        ) {
          return;
        }
        e.preventDefault();
        items.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  };

  const chart = document.getElementById("barChart");
  if (chart) {
    const weekData = readJson(chart, "chart");
    const max = Math.max(0.01, ...weekData.map((d) => Number(d.value) || 0));
    chart.innerHTML = weekData.length
      ? weekData
          .map(
            (d) => `
      <div class="sz-bar-col" title="${Number(d.value || 0).toFixed(2)} triệu đ">
        <div class="sz-bar-track">
          <div class="sz-bar" style="height:${((Number(d.value) || 0) / max) * 100}%"></div>
        </div>
        <span class="sz-bar-day">${d.day}</span>
      </div>`,
          )
          .join("")
      : `<p class="sz-panel-sub mb-0">Chưa có doanh thu trong kỳ này.</p>`;
  }

  const peakList = document.getElementById("peakList");
  if (peakList) {
    const peakData = readJson(peakList, "peak");
    peakList.innerHTML = peakData
      .map(
        (p) => `
      <div class="sz-peak">
        <div class="d-flex justify-content-between">
          <span class="sz-peak-label">
            <i class="sz-peak-dot" style="background:${p.color}"></i>${p.label}
          </span>
          <b class="sz-peak-pct" style="color:${p.color}">${p.pct}%</b>
        </div>
        <div class="sz-peak-track">
          <div class="sz-peak-fill" style="width:${p.pct}%;background:${p.color}"></div>
        </div>
      </div>`,
      )
      .join("");
  }

  activateGroup(document.getElementById("roleSwitch"), ".sz-switch-btn");
  activateGroup(document.getElementById("viewToggle"), ".sz-seg-btn");
  activateGroup(document.getElementById("facilityTabs"), ".sz-tab");
  activateGroup(document.getElementById("financeTabs"), ".sz-tab");

  const userSearch = document.getElementById("userSearch");
  const usersTable = document.getElementById("usersTable");
  if (userSearch && usersTable) {
    userSearch.addEventListener("input", () => {
      const q = userSearch.value.trim().toLowerCase();
      usersTable.querySelectorAll("tbody tr").forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(q)
          ? ""
          : "none";
      });
    });
  }
})();
