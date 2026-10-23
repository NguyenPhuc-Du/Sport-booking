const express = require("express");
const router = express.Router();

const controller = require("../../controllers/owner/price-rule.controller");
const validate = require("../../validates/owner/price-rule.validate");

router.get("/", controller.index);

router.get("/create", controller.create);

router.post("/create", validate.createPost, controller.createPost);

router.get("/edit/:id", controller.edit);

router.patch("/edit/:id", validate.editPatch, controller.editPatch);

router.patch("/change-status/:id/", controller.changeStatus);

module.exports = router;
