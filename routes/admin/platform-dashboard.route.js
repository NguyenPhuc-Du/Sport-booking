const express = require("express");
const controller = require("../../controllers/admin/platform-dashboard.controller");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("dashboard:view"), controller.index);

module.exports = router;
