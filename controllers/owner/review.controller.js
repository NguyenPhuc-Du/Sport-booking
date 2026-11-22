const reviewService = require("../../services/owner/review.service");

module.exports.index = async (req, res) => {
  try {
    const reviews = await reviewService.listForOwner(res.locals.user.id);
    return res.render("owner/pages/reviews/index", {
      pageTitle: "Đánh giá & Phản hồi",
      activeMenu: "reviews",
      reviews,
    });
  } catch (error) {
    console.error(error);
    return res.render("owner/pages/reviews/index", {
      pageTitle: "Đánh giá & Phản hồi",
      activeMenu: "reviews",
      reviews: [],
    });
  }
};

module.exports.reply = async (req, res) => {
  try {
    const data = await reviewService.reply(res.locals.user.id, req.params.id, req.body.reply);
    return res.json({ ok: true, ...data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error(error);
    return res.status(500).json({ message: "Gửi phản hồi thất bại" });
  }
};

module.exports.toggleHide = async (req, res) => {
  try {
    const data = await reviewService.toggleHidden(res.locals.user.id, req.params.id);
    return res.json({ ok: true, ...data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error(error);
    return res.status(500).json({ message: "Cập nhật ẩn/hiện thất bại" });
  }
};
