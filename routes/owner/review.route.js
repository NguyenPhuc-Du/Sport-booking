const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/review.controller");

router.get("/", controller.index);
router.post("/:id/reply", controller.reply);
router.post("/:id/toggle-hide", controller.toggleHide);

module.exports = router;
