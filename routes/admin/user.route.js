const express = require("express");
const controller = require("../../controllers/admin/user.controller");
const validate = require("../../validates/admin/platform-user.validate");

const router = express.Router();

router.get("/", controller.index);
router.post("/", validate.create, controller.create);
router.get("/:id", controller.detail);
router.post("/:id/roles", validate.assignRole, controller.assignRole);
router.post("/:id/status", validate.changeStatus, controller.changeStatus);
router.post("/:id/password", validate.resetPassword, controller.resetPassword);
router.post("/:id", validate.update, controller.update);

module.exports = router;
