const express = require("express");
const router = express.Router();
const controller = require("../../controllers/client/profile.controller");

router.get("/", controller.index);
router.post("/update", controller.update);

module.exports = router;
