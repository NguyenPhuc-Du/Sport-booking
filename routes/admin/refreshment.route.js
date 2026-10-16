const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/refreshment.controller");
const uploadCloud = require("../../middlewares/owner/uploadCloud.middleware");
const multer = require("multer");
const upload = multer();


router.get("/", controller.index);

router.get("/create", controller.create);

router.post("/create", upload.single("image"), uploadCloud.upload, controller.createPost);

router.get("/edit/:id", controller.edit);

router.patch("/edit/:id", upload.single("image"), uploadCloud.upload, controller.editPatch);

module.exports = router;
