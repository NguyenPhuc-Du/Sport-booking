const facilityService = require("../../services/facility.service");
const slotService = require("../../services/slot.service");
const Voucher = require("../../models/finance.model");

module.exports.home = async (req, res) => {
  try {
    const [sports, facilities] = await Promise.all([
      facilityService.listSports(),
      facilityService.listForHome({
        sport: req.query.sport || "all",
        q: req.query.q || "",
      }),
    ]);
    res.json({
      sports,
      amenities: [],
      facilities,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Không tải được danh sách sân" });
  }
};

module.exports.detail = async (req, res) => {
  try {
    const facility = await facilityService.getDetail(req.params.id);
    if (!facility) return res.status(404).json({ message: "Không tìm thấy cơ sở" });
    res.json({ facility });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Không tải được chi tiết sân" });
  }
};

module.exports.slots = async (req, res) => {
  try {
    const venue = await facilityService.getVenue(req.params.id);
    if (!venue) return res.status(404).json({ message: "Không tìm thấy cơ sở" });

    const court = await facilityService.getCourt(venue._id, req.query.courtId);
    if (!court) {
      return res.status(404).json({
        message: req.query.courtId ? "Không tìm thấy sân" : "Cơ sở chưa có sân",
      });
    }

    const date = req.query.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return res.status(400).json({ message: "Ngày không hợp lệ" });
    }

    const slots = await slotService.buildSlots(venue, court._id, date);
    return res.json({
      facilityId: String(venue._id),
      courtId: String(court._id),
      date,
      slots,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Không tải được giờ sân" });
  }
};

module.exports.checkoutOptions = async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({
      deleted: false,
      status: "active",
      start_date: { $lte: now },
      end_date: { $gte: now },
    })
      .select("code name")
      .lean();

    res.json({
      vouchers: vouchers.map((v) => ({ code: v.code, description: v.name })),
      payments: [
        { id: "vnpay", title: "VNPay", description: "ATM / thẻ / QR ngân hàng" },
      ],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Không tải được tùy chọn thanh toán" });
  }
};