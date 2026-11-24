const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/dashboard.controller");

router.get("/", controller.index);
router.get("/bookings", controller.bookings);
router.get("/courts", controller.courts);

module.exports = router;
