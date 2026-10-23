const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/booking.controller");

router.get("/", controller.index);
router.post("/create", controller.create);
router.post("/check-in", controller.checkIn);
router.post("/cancel", controller.cancel);

module.exports = router;
