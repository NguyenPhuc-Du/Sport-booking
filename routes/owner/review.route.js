const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("owner/pages/reviews/index", {
    pageTitle: "Đánh giá & Phản hồi",
    activeMenu: "reviews",
  });
});

module.exports = router;
