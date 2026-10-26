const express = require("express");
const controller = require("../../controllers/admin/user.controller");
const validate = require("../../validates/admin/platform-user.validate");

const router = express.Router();

router.get("/", controller.index);
router.post("/:id/roles", validate.assignRole, controller.assignRole);
// router.post("/:id/roles/:roleId/remove", controller.removeRole);
router.post("/:id/status", validate.changeStatus, controller.changeStatus);

module.exports = router;
