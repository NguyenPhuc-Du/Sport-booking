const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/booking.controller");

router.get("/", controller.index);
router.get("/list", controller.list);
router.get("/list/export", controller.exportList);
router.get("/:code/pdf", controller.bookingPdf);
router.post("/create", controller.create);
router.post("/check-in", controller.checkIn);
router.post("/cancel", controller.cancel);

module.exports = router;
