const express = require("express");
const controller = require("../../controllers/admin/readonly.controller");
const router = express.Router();

router.get("/venues", controller.venues);
router.get("/bookings", controller.bookings);

module.exports = router;
