const wallets = new Map();
const bookings = [];

function balanceOf(userId) {
  const key = String(userId);
  if (!wallets.has(key)) {
    wallets.set(key, 0);
  }
  return wallets.get(key);
}

function setBalance(userId, amount) {
  wallets.set(String(userId), amount);
  return amount;
}

function isSlotTaken(facilityId, courtId, date, time) {
  return bookings.some(
    (item) =>
      item.facilityId === facilityId &&
      item.courtId === courtId &&
      item.date === date &&
      item.time.startsWith(time) &&
      item.status !== "cancelled",
  );
}

function addBooking(booking) {
  bookings.unshift(booking);
  return booking;
}

function listBookings(userId, filter) {
  const items = bookings.filter((item) => item.userId === String(userId));
  if (!filter || filter === "all") {
    return items;
  }
  return items.filter((item) => item.status === filter);
}

function findBooking(userId, code) {
  return bookings.find((item) => item.userId === String(userId) && item.code === code) || null;
}

function bookingCounts(userId) {
  const items = listBookings(userId, "all");
  return {
    all: items.length,
    upcoming: items.filter((item) => item.status === "upcoming").length,
    completed: items.filter((item) => item.status === "completed").length,
    cancelled: items.filter((item) => item.status === "cancelled").length,
  };
}

module.exports = {
  balanceOf,
  setBalance,
  isSlotTaken,
  addBooking,
  listBookings,
  findBooking,
  bookingCounts,
};
