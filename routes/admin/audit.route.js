const express = require("express");
const controller = require("../../controllers/admin/audit.controller");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("audit_log:view"), controller.index);

module.exports = router;
