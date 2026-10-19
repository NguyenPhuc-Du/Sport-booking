const express = require("express");
const controller = require("../../controllers/admin/auth.controller");
const validate = require("../../validates/admin/platform-auth.validate");

const router = express.Router();

router.get("/login", controller.loginForm);
router.post("/login", validate.login, controller.login);
router.get("/logout", controller.logout);

module.exports = router;
