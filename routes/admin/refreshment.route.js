const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/refreshment.controller");
const uploadCloud = require("../../middlewares/owner/uploadCloud.middleware");
const multer = require("multer");
const upload = multer();


router.get("/", controller.index);

router.get("/create", controller.create);

router.post("/create", upload.single("image"), uploadCloud.upload, controller.createPost);

module.exports = router;
