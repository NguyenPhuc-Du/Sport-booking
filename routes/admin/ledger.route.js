const express = require("express");
const controller = require("../../controllers/admin/ledger.controller");
const validate = require("../../validates/admin/platform-ledger.validate");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("ledger:view"), controller.index);
router.get("/export", authorize("ledger:view"), controller.exportCsv);
router.post(
  "/adjustments",
  authorize("ledger:adjust"),
  validate.adjust,
  controller.adjust,
);

module.exports = router;
