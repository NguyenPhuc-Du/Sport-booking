const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/dashboard.controller");
const reportController = require("../../controllers/owner/report.controller");

router.get("/", controller.index);
router.get("/bookings", controller.bookings);
router.get("/courts", controller.courts);

router.get("/reports", reportController.index);
router.get("/reports/export.xlsx", reportController.exportExcel);
router.get("/reports/export.pdf", reportController.exportPdf);

module.exports = router;
