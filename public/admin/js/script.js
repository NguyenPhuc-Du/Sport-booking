// Dữ liệu tĩnh (thay bằng API sau này)
const weekData = [
  { day: 'T2', value: 4.2 }, { day: 'T3', value: 5.1 }, { day: 'T4', value: 6.0 },
  { day: 'T5', value: 5.4 }, { day: 'T6', value: 8.2 }, { day: 'T7', value: 10.5 }, { day: 'CN', value: 10.8 }
];
const peakData = [
  { label: 'Giờ vàng Tối (17:00 - 22:00)', pct: 96, color: '#f59e0b' },
  { label: 'Sáng sớm (06:00 - 09:00)', pct: 74, color: '#10b981' },
  { label: 'Buổi chiều (14:00 - 17:00)', pct: 58, color: '#0ea5e9' },
  { label: 'Buổi trưa (11:00 - 14:00)', pct: 32, color: '#94a3b8' }
];

const chart = document.getElementById('barChart');
const max = Math.max(...weekData.map(d => d.value));
chart.innerHTML = weekData.map(d => `
  <div class="sz-bar-col" title="${d.value.toFixed(1)} triệu đ">
    <div class="sz-bar-track"><div class="sz-bar" style="height:${(d.value / max) * 100}%"></div></div>
    <span class="sz-bar-day">${d.day}</span>
  </div>`).join('');

document.getElementById('peakList').innerHTML = peakData.map(p => `
  <div class="sz-peak">
    <div class="d-flex justify-content-between">
      <span class="sz-peak-label"><i class="sz-peak-dot" style="background:${p.color}"></i>${p.label}</span>
      <b class="sz-peak-pct" style="color:${p.color}">${p.pct}%</b>
    </div>
    <div class="sz-peak-track"><div class="sz-peak-fill" style="width:${p.pct}%;background:${p.color}"></div></div>
  </div>`).join('');

// Chuyển tab (role switch, khoảng thời gian, menu)
const activate = (selector, itemSel) => {
  const items = document.querySelectorAll(`${selector} ${itemSel}`);
  items.forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    items.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }));
};
activate('#roleSwitch', '.sz-switch-btn');
activate('#rangeTabs', 'button');
activate('.sz-menu', '.sz-menu-item');