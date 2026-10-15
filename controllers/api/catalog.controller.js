const catalog = require("../../services/catalog.service");
const store = require("../../services/user-app.store");

module.exports.home = (req, res) => {
  const sport = req.query.sport || "all";
  const q = req.query.q || "";
  res.json({
    sports: catalog.sports,
    amenities: catalog.amenities,
    facilities: catalog.listFacilities({ sport, q }),
  });
};

module.exports.detail = (req, res) => {
  const facility = catalog.getFacility(req.params.id);
  if (!facility) return res.status(404).json({ message: "Không tìm thấy cơ sở" });
  return res.json({ facility });
};

module.exports.slots = (req, res) => {
  const facility = catalog.getFacility(req.params.id);
  if (!facility) return res.status(404).json({ message: "Không tìm thấy cơ sở" });

  const court = catalog.getCourt(facility, req.query.courtId || facility.courts[0].id);
  if (!court) return res.status(404).json({ message: "Không tìm thấy sân" });

  const date = req.query.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return res.status(400).json({ message: "Ngày không hợp lệ" });
  }

  return res.json({
    facilityId: facility.id,
    courtId: court.id,
    date,
    slots: catalog.buildSlots(date, (time) => store.isSlotTaken(facility.id, court.id, date, time)),
  });
};

module.exports.checkoutOptions = (req, res) => {
  res.json({
    vouchers: catalog.vouchers,
    payments: catalog.paymentMethods,
  });
};
