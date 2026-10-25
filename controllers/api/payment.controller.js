const vnpay = require("../../services/app/vnpay.service");
const paymentService = require("../../services/app/payment.service");

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
    await paymentService.markPaidAndMail(result.txnRef, result.transactionNo);
    return backToApp(res, await paymentService.isPaid(result.txnRef), result.txnRef);
  }

  await paymentService.markFailed(result.txnRef);
  return backToApp(res, false, result.txnRef);
};

module.exports.vnpayIpn = async (req, res) => {
  const result = vnpay.verifyCallback(req.query);
  if (!result.valid) {
    return res.status(200).json({ RspCode: "97", Message: "Invalid signature" });
  }

  const response = await paymentService.handleIpn({
    txnRef: result.txnRef,
    amount: result.amount,
    responseCode: result.responseCode,
    transactionNo: result.transactionNo,
  });
  return res.status(200).json(response);
};
