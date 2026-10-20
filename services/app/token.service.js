const crypto = require("crypto");

const SECRET = process.env.TOKEN_SECRET || "sportzone-user-app-secret";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(userId) {
  const body = Buffer.from(
    JSON.stringify({
      userId: String(userId),
      exp: Date.now() + TTL_MS,
    }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verify(token) {
  if (!token || !token.includes(".")) {
    throw new Error("invalid");
  }
  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    throw new Error("invalid");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
    throw new Error("expired");
  }
  return payload;
}

module.exports = { sign, verify };
