const reviewService = require("../../services/app/review.service");

function fail(res, error, fallback) {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: fallback });
}

module.exports.create = async (req, res) => {
  try {
    const review = await reviewService.create(req.auth.userId, req.body || {});
    return res.status(201).json({ review });
  } catch (error) {
    return fail(res, error, "Gửi đánh giá thất bại");
  }
};

module.exports.update = async (req, res) => {
  try {
    const review = await reviewService.update(req.auth.userId, req.params.id, req.body || {});
    return res.json({ review });
  } catch (error) {
    return fail(res, error, "Cập nhật đánh giá thất bại");
  }
};

module.exports.mine = async (req, res) => {
  try {
    const reviews = await reviewService.listMine(req.auth.userId);
    return res.json({ reviews });
  } catch (error) {
    return fail(res, error, "Không tải được đánh giá");
  }
};

module.exports.forFacility = async (req, res) => {
  try {
    const reviews = await reviewService.listForFacility(req.params.id);
    return res.json({ reviews });
  } catch (error) {
    return fail(res, error, "Không tải được đánh giá cơ sở");
  }
};
