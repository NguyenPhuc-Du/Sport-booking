const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/price-rule.controller");

router.get("/", controller.index);

router.get("/create", controller.create);

module.exports = router;
