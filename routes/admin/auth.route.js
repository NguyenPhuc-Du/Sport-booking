const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/auth.controller");
const validate = require("../../validates/auth.validate");

router.get("/login", validate.loginPost, controller.login);

module.exports = router;
