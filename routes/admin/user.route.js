const express = require("express");
const controller = require("../../controllers/admin/user.controller");
const validate = require("../../validates/admin/platform-user.validate");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("user:view"), controller.index);
router.post("/", authorize("user:create"), validate.create, controller.create);
router.get("/:id", authorize("user:view"), controller.detail);
router.post(
  "/:id/roles",
  authorize("user:change_role"),
  validate.assignRole,
  controller.assignRole,
);
router.post(
  "/:id/status",
  authorize("user:lock"),
  validate.changeStatus,
  controller.changeStatus,
);
router.post(
  "/:id/password",
  authorize("user:reset_password"),
  validate.resetPassword,
  controller.resetPassword,
);
router.post(
  "/:id",
  authorize("user:update"),
  validate.update,
  controller.update,
);

module.exports = router;
