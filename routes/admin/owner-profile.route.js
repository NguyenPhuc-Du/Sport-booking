const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/owner-profile.controller");
const validate = require("../../validates/admin/owner-profile.validate");

const uploadCloud = require("../../middlewares/owner/uploadCloud.middleware");
const multer = require("multer");
const upload = multer();


router.get("/", controller.index);

router.post("/update", upload.single("avatar_url"), validate.updatePatch, uploadCloud.upload, controller.update);

module.exports = router;
