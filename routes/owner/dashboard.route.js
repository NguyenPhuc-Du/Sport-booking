const express = require("express");
const multer = require("multer");
const router = express.Router();
const controller = require("../../controllers/owner/dashboard.controller");
const reportController = require("../../controllers/owner/report.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", controller.index);
router.get("/bookings", controller.bookings);
router.get("/courts", controller.courts);

router.get("/reports", reportController.index);
router.get("/reports/export.xlsx", reportController.exportExcel);
router.get("/reports/export.pdf", reportController.exportPdf);
router.post("/reports/import", upload.single("file"), reportController.importExcel);

module.exports = router;
