const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/finance.controller");

router.get("/", controller.index);

router.get("/create", controller.create);

module.exports = router;
