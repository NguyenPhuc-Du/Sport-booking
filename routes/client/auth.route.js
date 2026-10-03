const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/auth.controller");
const validate = require("../../validates/client/auth.validate");

router.get("/login", controller.login);

router.get("/register", controller.register);

router.post("/register", validate.registerPost, controller.registerPost);


module.exports = router;    