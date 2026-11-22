const express = require("express");
const controller = require("../../controllers/admin/commission.controller");
const validate = require("../../validates/admin/platform-commission.validate");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("commission:view"), controller.index);
router.post(
  "/close",
  authorize("commission:update"),
  validate.close,
  controller.close,
);

module.exports = router;
