const Booking = require("../../models/booking.model");
const User = require("../../models/user.model");
const Voucher = require("../../models/finance.model");
const mailService = require("./mail.service");
const drinkService = require("./drink.service");

async function markPaidAndMail(txnRef, transactionNo) {
  const booking = await Booking.findOneAndUpdate(
    { code: txnRef, status: "pending_payment" },
    {
      $set: {
        status: "upcoming",
        statusLabel: "SẮP DIỄN RA",
        vnpTransactionNo: transactionNo || null,
        paidAt: new Date(),
        expiresAt: null,
      },
    },
    { returnDocument: "after" },
  );

  if (!booking) return { ok: (await Booking.exists({ code: txnRef })) != null };

  if (booking.voucherCode) {
    await Voucher.updateOne({ code: booking.voucherCode }, { $inc: { used_count: 1 } });
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
        courtPrice: booking.courtPrice,
        discount: booking.discount,
        drinks: booking.drinks,
        drinkTotal: booking.drinkTotal,
        amount: booking.amount,
      });
    } catch (error) {
      console.error(error);
    }
  }
  return { ok: true };
}

async function markFailed(txnRef) {
  const booking = await Booking.findOneAndUpdate(
    { code: txnRef, status: "pending_payment" },
    { status: "cancelled", statusLabel: "THANH TOÁN THẤT BẠI" },
    { returnDocument: "after" },
  );
  if (booking) await drinkService.releaseDrinks(booking._id);
}

async function isPaid(txnRef) {
  return (await Booking.exists({ code: txnRef, status: "upcoming" })) != null;
}

async function handleIpn({ txnRef, amount, responseCode, transactionNo }) {
  const booking = await Booking.findOne({ code: txnRef });
  if (!booking) return { RspCode: "01", Message: "Order not found" };
  if (Number(booking.amount) !== Number(amount)) {
    return { RspCode: "04", Message: "Invalid amount" };
  }
  if (booking.status !== "pending_payment") {
    return { RspCode: "02", Message: "Order already confirmed" };
  }

  if (responseCode === "00") {
    await markPaidAndMail(txnRef, transactionNo);
    return { RspCode: "00", Message: "Success" };
  }

  await markFailed(txnRef);
  return { RspCode: "00", Message: "Confirmed" };
}

module.exports = { markPaidAndMail, markFailed, isPaid, handleIpn };
