const express = require("express");
const controller = require("../../controllers/admin/commission.controller");
const validate = require("../../validates/admin/platform-commission.validate");

const router = express.Router();

router.get("/", controller.index);
router.post("/close", validate.close, controller.close);

module.exports = router;
