const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/auth.controller");
const validate = require("../../validates/auth.validate");

router.get("/login", controller.login);

router.post("/login", validate.loginPost, controller.loginPost);

router.get("/register", controller.register);

router.post("/register", validate.registerPost, controller.registerPost);


module.exports = router;    