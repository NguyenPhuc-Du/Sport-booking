const express = require("express");
const controller = require("../../controllers/admin/thong-ke.controller");
const authorize = require("../../middlewares/admin/authorize.middleware");

const router = express.Router();

router.get("/", authorize("commission:report"), controller.index);

module.exports = router;
