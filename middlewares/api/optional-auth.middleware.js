const tokenService = require("../../services/app/token.service");

/** Attach req.auth when Bearer token is valid; continue as guest otherwise. */
module.exports = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    req.auth = null;
    return next();
  }
  try {
    req.auth = tokenService.verify(token);
  } catch (error) {
    req.auth = null;
  }
  return next();
};
