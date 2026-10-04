const express = require("express");
const router = express.Router();
const controller = require("../../controllers/client/facility.controller");

router.get("/:id", controller.detail);
router.get("/:id/booking", controller.booking);

module.exports = router;
