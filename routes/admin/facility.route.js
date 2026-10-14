const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/facility.controller");

router.get("/", controller.index);
router.get("/venues", controller.indexVenues);
router.get("/venues/create", controller.createVenues);
module.exports = router;
