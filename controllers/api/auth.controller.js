const tokenService = require("../../services/app/token.service");
const authService = require("../../services/app/auth.service");
const { toUser } = require("./user.mapper");

function fail(res, status, message) {
  return res.status(status).json({ message });
}

function handle(res, error, fallback) {
  if (error.status) return fail(res, error.status, error.message);
  if (error.code === 11000) return fail(res, 409, "Email này đã được đăng ký");
  console.error(error);
  return fail(res, 500, fallback);
}

function issueSession(res, user, statusCode) {
  const token = tokenService.sign(user._id);
  return res.status(statusCode).json({ token, user: toUser(user) });
}

module.exports.register = async (req, res) => {
  try {
    return res.json({ message: await authService.register(req.body) });
  } catch (error) {
    return handle(res, error, "Gửi mã xác minh thất bại");
  }
};

module.exports.registerVerify = async (req, res) => {
  try {
    return issueSession(res, await authService.registerVerify(req.body), 201);
  } catch (error) {
    return handle(res, error, "Xác minh đăng ký thất bại");
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    return res.json({ message: await authService.resendOtp(req.body) });
  } catch (error) {
    return handle(res, error, "Gửi lại mã thất bại");
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    return res.json({ message: await authService.forgotPassword(req.body) });
  } catch (error) {
    return handle(res, error, "Gửi mã thất bại");
  }
};

module.exports.verifyResetOtp = async (req, res) => {
  try {
    return res.json({ message: await authService.verifyResetOtp(req.body) });
  } catch (error) {
    return handle(res, error, "Xác minh mã thất bại");
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    return res.json({ message: await authService.resetPassword(req.body) });
  } catch (error) {
    return handle(res, error, "Đặt lại mật khẩu thất bại");
  }
};

module.exports.login = async (req, res) => {
  try {
    return issueSession(res, await authService.login(req.body), 200);
  } catch (error) {
    return handle(res, error, "Đăng nhập thất bại");
  }
};

module.exports.me = async (req, res) => {
  try {
    return res.json({ user: toUser(await authService.me(req.auth.userId)) });
  } catch (error) {
    return handle(res, error, "Không tải được tài khoản");
  }
};
