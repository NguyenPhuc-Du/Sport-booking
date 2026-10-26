const Booking = require("../../models/booking.model");
const Court = require("../../models/court.model");
require("../../models/user.model");
const facilityService = require("./facility.service");
const { nowInVietnam } = require("../app/slot.service");
const ACTIVE_STATUSES = ["pending_payment", "upcoming", "completed"];
const PAID_STATUSES = ["upcoming", "completed"];
const HOURS = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const PEAKS = [
  { label: "Giờ vàng Tối (17:00 - 22:00)", start: 17, end: 22, color: "#f59e0b" },
  { label: "Sáng sớm (06:00 - 09:00)", start: 6, end: 9, color: "#10b981" },
  { label: "Buổi chiều (14:00 - 17:00)", start: 14, end: 17, color: "#0ea5e9" },
  { label: "Buổi trưa (11:00 - 14:00)", start: 11, end: 14, color: "#94a3b8" },
];
const STATUS_VIEW = {
  upcoming: { status: "approved", statusLabel: "Đã duyệt" },
  pending_payment: { status: "pending", statusLabel: "Chờ thanh toán" },
  completed: { status: "done", statusLabel: "Hoàn thành" },
};
function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
function padDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function eachDate(from, to) {
  const dates = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}
function weekdayLabel(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}
function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")}đ`;
}
function formatBookingTime(booking) {
  const [, month, day] = String(booking.date || "").split("-");
  return `${day}/${month} · ${booking.timeStart || ""}-${booking.timeEnd || ""}`;
}
function hourOf(value) {
  return Number(String(value || "00:00").slice(0, 2));
}
function bookingHours(booking) {
  const start = hourOf(booking.timeStart);
  const end = hourOf(booking.timeEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return end - start;
}
function bookingHourList(booking) {
  const start = hourOf(booking.timeStart);
  const count = bookingHours(booking);
  return Array.from({ length: count }, (_, index) => start + index);
}
function isPaid(booking) {
  return PAID_STATUSES.includes(booking.status);
}
function sumPaid(bookings) {
  return bookings.filter(isPaid).reduce((total, booking) => total + Number(booking.amount || 0), 0);
}
function changeNote(current, previous, suffix) {
  if (previous === 0 && current === 0) {
    return { note: "Chưa có dữ liệu kỳ trước", noteClass: "note-orange" };
  }
  if (previous === 0) {
    return { note: `Kỳ trước chưa có dữ liệu${suffix}`, noteClass: "note-green" };
  }
  const percent = ((current - previous) / previous) * 100;
  const sign = percent >= 0 ? "+" : "";
  return {
    note: `${sign}${percent.toFixed(1)}% so với kỳ trước`,
    noteClass: percent >= 0 ? "note-green" : "note-orange",
  };
}
function resolveRange(rangeKey) {
const today = nowInVietnam().date;
const [year, month] = today.split("-").map(Number);
const range = ["7d", "month", "quarter"].includes(rangeKey) ? rangeKey : "7d";
if (range === "month") {
  return {
    range,
    from: padDate(year, month, 1),
    to: today,
    label: "tháng này",
    statLabel: "THÁNG",
  };
}
if (range === "quarter") {
  const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return {
    range,
    from: padDate(year, startMonth, 1),
    to: today,
    label: `quý ${quarter}/${year}`,
    statLabel: "QUÝ",
  };
}
return {
  range: "7d",
  from: addDays(today, -6),
  to: today,
  label: "7 ngày qua",
  statLabel: "TUẦN",
};
}
function previousRange(range, from) {
if (range === "month") {
  const [year, month] = from.split("-").map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return {
    from: padDate(prevYear, prevMonth, 1),
    to: padDate(prevYear, prevMonth, daysInMonth(prevYear, prevMonth)),
  };
}
if (range === "quarter") {
  const [year, month] = from.split("-").map(Number);
  const prevMonth = month - 3;
  if (prevMonth > 0) {
    return { from: padDate(year, prevMonth, 1), to: addDays(from, -1) };
  }
  return { from: padDate(year - 1, 10, 1), to: padDate(year - 1, 12, 31) };
}
return { from: addDays(from, -7), to: addDays(from, -1) };
}
function venueNameOf(venues) {
if (!venues.length) return "Chưa có cơ sở";
if (venues.length === 1) return venues[0].name;
return `${venues.length} cơ sở`;
}
async function loadBookings(venueIds, from, to) {
if (!venueIds.length) return [];
return Booking.find({
  facilityId: { $in: venueIds },
  date: { $gte: from, $lte: to },
  status: { $in: ACTIVE_STATUSES },
})
  .populate("userId", "fullName")
  .sort({ createdAt: -1 })
  .lean();
}
function buildStats({ bookings, previous, todayBookings, fillPct, goldenPct, newCustomers, returnRate, statLabel }) {
const revenue = sumPaid(bookings);
const previousRevenue = sumPaid(previous);
const revenueNote = changeNote(revenue, previousRevenue, "");
const bookingNote = changeNote(bookings.length, previous.length, "");
const todayNote =
  todayBookings > 0 ? `+${todayBookings} đơn mới hôm nay` : "Chưa có đơn mới hôm nay";
return [
  {
    label: `DOANH THU ${statLabel}`,
    value: formatMoney(revenue),
    note: revenueNote.note,
    noteClass: revenueNote.noteClass,
  },
  {
    label: "TỔNG LƯỢT ĐẶT",
    value: `${bookings.length} lượt`,
    note: todayBookings > 0 ? todayNote : bookingNote.note,
    noteClass: todayBookings > 0 ? "note-orange" : bookingNote.noteClass,
  },
  {
    label: "TỶ LỆ LẤP ĐẦY SÂN",
    value: `${fillPct}%`,
    note: `Giờ vàng (17h-22h) đạt ${goldenPct}%`,
    noteClass: "note-orange",
  },
  {
    label: "KHÁCH HÀNG MỚI",
    value: `${newCustomers} người`,
    note: `Tỷ lệ quay lại ${returnRate}%`,
    noteClass: "note-green",
  },
];
}

function buildStats({ bookings, previous, todayBookings, fillPct, goldenPct, newCustomers, returnRate, statLabel }) {
    const revenue = sumPaid(bookings);
    const previousRevenue = sumPaid(previous);
    const revenueNote = changeNote(revenue, previousRevenue, "");
    const bookingNote = changeNote(bookings.length, previous.length, "");
    const todayNote =
      todayBookings > 0 ? `+${todayBookings} đơn mới hôm nay` : "Chưa có đơn mới hôm nay";
    return [
      {
        label: `DOANH THU ${statLabel}`,
        value: formatMoney(revenue),
        note: revenueNote.note,
        noteClass: revenueNote.noteClass,
      },
      {
        label: "TỔNG LƯỢT ĐẶT",
        value: `${bookings.length} lượt`,
        note: todayBookings > 0 ? todayNote : bookingNote.note,
        noteClass: todayBookings > 0 ? "note-orange" : bookingNote.noteClass,
      },
      {
        label: "TỶ LỆ LẤP ĐẦY SÂN",
        value: `${fillPct}%`,
        note: `Giờ vàng (17h-22h) đạt ${goldenPct}%`,
        noteClass: "note-orange",
      },
      {
        label: "KHÁCH HÀNG MỚI",
        value: `${newCustomers} người`,
        note: `Tỷ lệ quay lại ${returnRate}%`,
        noteClass: "note-green",
      },
    ];
  }
  function buildTopCourts(courts, bookings, dayCount) {
    const capacity = Math.max(1, HOURS.length * Math.max(1, dayCount));
    const byCourt = new Map();
    for (const court of courts) {
      byCourt.set(String(court._id), {
        name: court.name,
        sport: court.court_type_id?.name || "Khác",
        bookings: 0,
        revenue: 0,
        hours: 0,
      });
    }
    for (const booking of bookings) {
      const key = String(booking.courtId);
      if (!byCourt.has(key)) {
        byCourt.set(key, {
          name: booking.courtName || "Sân",
          sport: "Khác",
          bookings: 0,
          revenue: 0,
          hours: 0,
        });
      }
      const row = byCourt.get(key);
      row.bookings += 1;
      row.hours += bookingHours(booking);
      if (isPaid(booking)) row.revenue += Number(booking.amount || 0);
    }
    return [...byCourt.values()]
      .filter((row) => row.bookings > 0 || row.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
      .slice(0, 4)
      .map((row, index) => ({
        rank: index + 1,
        name: row.name,
        sport: row.sport,
        bookings: row.bookings,
        revenue: formatMoney(row.revenue),
        fill: Math.min(100, Math.round((row.hours / capacity) * 100)),
      }));
  }
  function buildLatestBookings(bookings) {
    return bookings.slice(0, 4).map((booking) => {
      const view = STATUS_VIEW[booking.status] || STATUS_VIEW.pending_payment;
      return {
        code: booking.code,
        pay: String(booking.paymentMethod || "vnpay").toUpperCase(),
        customer: booking.guestName || "Khách",
        court: booking.courtName || "Sân",
        time: formatBookingTime(booking),
        amount: formatMoney(booking.amount),
        status: view.status,
        statusLabel: view.statusLabel,
      };
    });
  }
  function buildChartData(bookings, from, to) {
    const dates = eachDate(from, to).slice(-7);
    const paidByDate = new Map(dates.map((date) => [date, 0]));
    for (const booking of bookings) {
      if (!isPaid(booking) || !paidByDate.has(booking.date)) continue;
      paidByDate.set(booking.date, paidByDate.get(booking.date) + Number(booking.amount || 0));
    }
    return dates.map((date) => ({
      day: weekdayLabel(date),
      value: Number((paidByDate.get(date) / 1_000_000).toFixed(2)),
    }));
  }
  
function peakFill(bookings, peak, activeCourts, dayCount) {
    const hours = peak.end - peak.start;
    const capacity = Math.max(1, activeCourts * hours * Math.max(1, dayCount));
    let used = 0;
    for (const booking of bookings) {
      used += bookingHourList(booking).filter((hour) => hour >= peak.start && hour < peak.end).length;
    }
    return Math.min(100, Math.round((used / capacity) * 100));
  }
  function buildPeakData(bookings, activeCourts, dayCount) {
    return PEAKS.map((peak) => ({
      label: peak.label,
      pct: peakFill(bookings, peak, activeCourts, dayCount),
      color: peak.color,
    }));
  }
  async function customerStats(venueIds, bookings, from) {
    const currentIds = [
      ...new Set(
        bookings
          .map((booking) => (booking.userId?._id || booking.userId || "").toString())
          .filter(Boolean),
      ),
    ];
    if (!venueIds.length || !currentIds.length) {
      return { newCustomers: 0, returnRate: 0 };
    }
    const previousIds = await Booking.distinct("userId", {
      facilityId: { $in: venueIds },
      date: { $lt: from },
      status: { $in: PAID_STATUSES },
    });
    const previousSet = new Set(previousIds.map(String));
    const returning = currentIds.filter((id) => previousSet.has(id)).length;
    return {
      newCustomers: currentIds.length - returning,
      returnRate: Math.round((returning / currentIds.length) * 100),
    };
  }
  async function getOverview(ownerId, rangeKey) {
    const { range, from, to, label, statLabel } = resolveRange(rangeKey);
    const prev = previousRange(range, from);
    const today = nowInVietnam().date;
    const dayCount = eachDate(from, to).length;
    const venues = await facilityService.getAllVenueByOwnerId(ownerId);
    const venueIds = venues.map((venue) => venue._id);
    const courts = venueIds.length
      ? await Court.find({
          venue_id: { $in: venueIds },
          deleted: { $ne: true },
        })
          .populate("court_type_id", "name")
          .lean()
      : [];
    const activeCourts = courts.filter((court) => court.status === "active").length;
    const [bookings, previous] = await Promise.all([
      loadBookings(venueIds, from, to),
      loadBookings(venueIds, prev.from, prev.to),
    ]);
    const fillPct = peakFill(
      bookings,
      { start: 6, end: 22 },
      activeCourts,
      dayCount,
    );
    const goldenPct = peakFill(
      bookings,
      { start: 17, end: 22 },
      activeCourts,
      dayCount,
    );
    const { newCustomers, returnRate } = await customerStats(venueIds, bookings, from);
    const todayBookings = bookings.filter((booking) => booking.date === today).length;
    return {
      range,
      rangeLabel: label,
      venueName: venueNameOf(venues),
      stats: buildStats({
        bookings,
        previous,
        todayBookings,
        fillPct,
        goldenPct,
        newCustomers,
        returnRate,
        statLabel,
      }),
      topCourts: buildTopCourts(courts, bookings, dayCount),
      latestBookings: buildLatestBookings(bookings),
      chartData: buildChartData(bookings, from, to),
      peakData: buildPeakData(bookings, activeCourts, dayCount),
    };
  }
  module.exports = { getOverview };