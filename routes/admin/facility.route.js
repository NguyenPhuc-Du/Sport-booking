const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/facility.controller");
const uploadCloud = require("../../middlewares/owner/uploadCloud.middleware");
const multer = require("multer");
const upload = multer();
router.get("/", controller.index);
router.get("/venues", controller.indexVenues);
router.get("/venues/create", controller.createVenues);
router.post(
  "/venues/create",
  upload.single("image_url"),
  uploadCloud.upload,
  controller.createVenuesPost,
);
module.exports = router;
