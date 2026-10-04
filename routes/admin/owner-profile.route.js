const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/owner-profile.controller");

router.get("/", controller.index);
router.post("/update", controller.update);

module.exports = router;
