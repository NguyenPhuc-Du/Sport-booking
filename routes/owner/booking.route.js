const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/booking.controller");

router.get("/", controller.index);

module.exports = router;
