const bookingService = require("../../services/app/booking.service");

function fail(res, status, message) {
  return res.status(status).json({ message });
}

function handle(res, error, fallback) {
  if (error.status) return fail(res, error.status, error.message);
  console.error(error);
  return fail(res, 500, fallback);
}

function clientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    "127.0.0.1"
  );
}

module.exports.quote = async (req, res) => {
  try {
    return res.json(await bookingService.quote(req.body));
  } catch (error) {
    return handle(res, error, "Không tính được giá");
  }
};

module.exports.create = async (req, res) => {
  try {
    const result = await bookingService.create({
      userId: req.auth.userId,
      body: req.body,
      ipAddr: clientIp(req),
    });
    return res.status(201).json(result);
  } catch (error) {
    return handle(res, error, "Đặt sân thất bại");
  }
};

module.exports.list = async (req, res) => {
  try {
    return res.json(await bookingService.list(req.auth.userId, req.query.filter || "all"));
  } catch (error) {
    return handle(res, error, "Không tải được lịch đặt");
  }
};

module.exports.cancel = async (req, res) => {
  try {
    return res.json(await bookingService.cancel(req.auth.userId, req.params.code));
  } catch (error) {
    return handle(res, error, "Hủy đơn thất bại");
  }
};
