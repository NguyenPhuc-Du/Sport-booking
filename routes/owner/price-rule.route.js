const express = require("express");
const router = express.Router();

const controller = require("../../controllers/owner/price-rule.controller");

router.get("/", controller.index);

router.get("/create", controller.create);

module.exports = router;
