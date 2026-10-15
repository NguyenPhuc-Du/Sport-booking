const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/owner-profile.controller");
const validate = require("../../validates/admin/owner-profile.validate");

router.get("/", controller.index);
router.post("/update", validate.updatePatch, controller.update);

module.exports = router;
