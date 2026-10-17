const crypto = require("crypto");
const qs = require("qs");

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

function hmacSha512(secret, data) {
  return crypto.createHmac("sha512", secret).update(data, "utf-8").digest("hex");
}

function createPaymentUrl({ amount, orderId, orderInfo, ipAddr, locale = "vn" }) {
  const date = new Date();
  const createDate = formatDate(date);
  const expireDate = formatDate(new Date(date.getTime() + 15 * 60 * 1000));

  let vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNP_TMN_CODE,
    vnp_Amount: Math.round(amount) * 100, // VNPay tính theo đơn vị x100
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: locale,
    vnp_ReturnUrl: process.env.VNP_RETURN_URL,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  vnpParams = sortObject(vnpParams);
  const signData = qs.stringify(vnpParams, { encode: false });
  const secureHash = hmacSha512(process.env.VNP_HASH_SECRET, signData);

  vnpParams.vnp_SecureHash = secureHash;
  return `${process.env.VNP_URL}?${qs.stringify(vnpParams, { encode: false })}`;
}

function verifyCallback(query) {
  const params = { ...query };
  const secureHash = params.vnp_SecureHash;
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sorted = sortObject(params);
  const signData = qs.stringify(sorted, { encode: false });
  const check = hmacSha512(process.env.VNP_HASH_SECRET, signData);

  return {
    valid: check === secureHash,
    responseCode: params.vnp_ResponseCode,
    txnRef: params.vnp_TxnRef,
    transactionNo: params.vnp_TransactionNo,
    amount: Number(params.vnp_Amount || 0) / 100,
  };
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

module.exports = { createPaymentUrl, verifyCallback };