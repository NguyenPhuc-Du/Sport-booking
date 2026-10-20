const Booking = require("../../models/booking.model");
const User = require("../../models/user.model");
const Voucher = require("../../models/finance.model");
const vnpay = require("../../services/app/vnpay.service");
const mailService = require("../../services/app/mail.service");

async function markPaidAndMail(txnRef, transactionNo) {
  const booking = await Booking.findOneAndUpdate(
    { code: txnRef, status: "pending_payment" },
    { $set: { status: "upcoming", statusLabel: "SẮP DIỄN RA", vnpTransactionNo: transactionNo || null, paidAt: new Date(), expiresAt: null } },
    { new: true },
  );
  
  if (!booking) return { ok: (await Booking.exists({ code: txnRef })) != null };

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

function backToApp(res, ok, code) {
  const link = `sportzone://payment/${ok ? "success" : "failed"}?code=${encodeURIComponent(code || "")}`;
  const title = ok ? "Thanh toán thành công" : "Thanh toán thất bại";
  const color = ok ? "#2e7d32" : "#c62828";
  res.set("Content-Type", "text/html; charset=utf-8").send(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px 24px">
  <h2 style="color:${color}">${title}</h2>
  <p>Mã đơn: <b>${code || "-"}</b></p>
  <p><a href="${link}" style="display:inline-block;padding:14px 24px;background:#1e88e5;color:#fff;border-radius:10px;text-decoration:none">Quay lại ứng dụng</a></p>
  <script>setTimeout(function(){ location.href = ${JSON.stringify(link)}; }, 300);</script>
</body></html>`);
}

module.exports.vnpayReturn = async (req, res) => {
  const result = vnpay.verifyCallback(req.query);
  if (!result.valid) return backToApp(res, false, result.txnRef);

  if (result.responseCode === "00") {
    await markPaidAndMail(result.txnRef, result.transactionNo);
    const paid = await Booking.exists({ code: result.txnRef, status: "upcoming" });
    return backToApp(res, Boolean(paid), result.txnRef);
  }

  await Booking.findOneAndUpdate(
    { code: result.txnRef, status: "pending_payment" },
    { status: "cancelled", statusLabel: "THANH TOÁN THẤT BẠI" },
  );
  return backToApp(res, false, result.txnRef);
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