const express = require("express");
const controller = require("../../controllers/admin/commission.controller");
const report = require("../../controllers/admin/report.controller");
const validate = require("../../validates/admin/platform-commission.validate");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("commission:view"), controller.index);
router.get("/lines", authorize("commission:view"), report.lines);
router.post(
  "/close",
  authorize("commission:update"),
  validate.close,
  controller.close,
);
router.post(
  "/collect",
  authorize("commission:update"),
  validate.close,
  controller.collect,
);
router.post("/cau-hinh", authorize("commission:update"), controller.luuCauHinh);

module.exports = router;
