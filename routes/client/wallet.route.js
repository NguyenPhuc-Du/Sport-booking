const express = require("express");
const router = express.Router();
const controller = require("../../controllers/client/wallet.controller");

router.get("/", controller.index);
router.post("/top-up", controller.topUp);

module.exports = router;
