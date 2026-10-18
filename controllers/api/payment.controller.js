const Booking = require("../../models/booking.model");
const User = require("../../models/user.model");
const Voucher = require("../../models/finance.model");
const vnpay = require("../../services/vnpay.service");
const mailService = require("../../services/mail.service");

async function markPaidAndMail(txnRef, transactionNo) {
  const booking = await Booking.findOne({ code: txnRef });
  if (!booking) return { ok: false };
  if (booking.status !== "pending_payment") return { ok: true };

  booking.status = "upcoming";
  booking.statusLabel = "SẮP DIỄN RA";
  booking.vnpTransactionNo = transactionNo || null;
  booking.paidAt = new Date();
  booking.expiresAt = null;
  await booking.save();

  if (booking.voucherCode) {
    await Voucher.updateOne(
      { code: booking.voucherCode },
      { $inc: { used_count: 1 } }
    );
  }

  const user = await User.findById(booking.userId);
  if (user?.email) {
    try {
      await mailService.sendBookingMail(user.email, {
        code: booking.code,
        vnpTransactionNo: booking.vnpTransactionNo,
        facilityName: booking.facilityName,
        courtName: booking.courtName,
        date: booking.date,
        time: booking.time,
        amount: booking.amount,
      });
    } catch (e) {
      console.error(e);
    }
  }
  return { ok: true };
}

module.exports.vnpayReturn = async (req, res) => {
  const result = vnpay.verifyCallback(req.query);
  if (!result.valid) return res.status(400).send("Sai chữ ký VNPay");

  if (result.responseCode === "00") {
    await markPaidAndMail(result.txnRef, result.transactionNo);
    const paid = await Booking.exists({ code: result.txnRef, status: "upcoming" });
    if (paid) return res.redirect(`sportzone://payment/success?code=${result.txnRef}`);
    return res.redirect(`sportzone://payment/failed?code=${result.txnRef}`);
  }

  await Booking.findOneAndUpdate(
    { code: result.txnRef, status: "pending_payment" },
    { status: "cancelled", statusLabel: "THANH TOÁN THẤT BẠI" }
  );
  return res.redirect(`sportzone://payment/failed?code=${result.txnRef}`);
};

module.exports.vnpayIpn = async (req, res) => {
  const result = vnpay.verifyCallback(req.query);
  if (!result.valid) {
    return res.status(200).json({ RspCode: "97", Message: "Invalid signature" });
  }

  const booking = await Booking.findOne({ code: result.txnRef });
  if (!booking) {
    return res.status(200).json({ RspCode: "01", Message: "Order not found" });
  }
  if (Number(booking.amount) !== Number(result.amount)) {
    return res.status(200).json({ RspCode: "04", Message: "Invalid amount" });
  }
  if (booking.status !== "pending_payment") {
    return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
  }

  if (result.responseCode === "00") {
    await markPaidAndMail(result.txnRef, result.transactionNo);
    return res.status(200).json({ RspCode: "00", Message: "Success" });
  }

  booking.status = "cancelled";
  booking.statusLabel = "THANH TOÁN THẤT BẠI";
  await booking.save();
  return res.status(200).json({ RspCode: "00", Message: "Confirmed" });
};