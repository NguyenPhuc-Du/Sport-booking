const express = require("express");
const controller = require("../../controllers/admin/role.controller");
const validate = require("../../validates/admin/role.validate");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("role:manage"), controller.index);
router.post("/", authorize("role:manage"), validate.create, controller.create);
router.get("/:id", authorize("role:manage"), controller.edit);
router.post("/:id/permissions", authorize("role:manage"), controller.savePermissions);
router.post("/:id/delete", authorize("role:manage"), controller.remove);
router.post("/:id", authorize("role:manage"), validate.update, controller.update);

module.exports = router;
