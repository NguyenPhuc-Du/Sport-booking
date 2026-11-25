const express = require("express");
const controller = require("../../controllers/admin/payment.controller");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();
router.get("/", authorize("commission:payments"), controller.index);

module.exports = router;
