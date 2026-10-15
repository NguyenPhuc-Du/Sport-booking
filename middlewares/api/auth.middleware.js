const tokenService = require("../../services/token.service");

module.exports = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ message: "Bạn cần đăng nhập" });
  }
  try {
    req.auth = tokenService.verify(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  }
};
