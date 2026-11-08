const express = require("express");
const controller = require("../../controllers/admin/ledger.controller");
const validate = require("../../validates/admin/platform-ledger.validate");

const router = express.Router();

router.get("/", controller.index);
router.get("/export", controller.exportCsv);
router.post("/adjustments", validate.adjust, controller.adjust);

module.exports = router;
