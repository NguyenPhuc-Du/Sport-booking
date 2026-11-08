function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function percentLabel(rate) {
  const value = Math.round(Number(rate) * 1000) / 10;
  return `${value}%`;
}

module.exports = { formatVnd, percentLabel };
