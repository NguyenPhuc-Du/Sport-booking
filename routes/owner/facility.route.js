const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/facility.controller");
const uploadCloud = require("../../middlewares/owner/uploadCloud.middleware");
const priceRuleRoute = require("./price-rule.route");
const multer = require("multer");
const upload = multer();
router.get("/", controller.index);
router.get("/venues", controller.indexVenues);
router.get("/venues/create", controller.createVenues);
router.get("/venues/edit/:id", controller.editVenues);
router.delete("/venues/delete/:id", controller.deleteVenues);
router.post(
  "/venues/create",
  upload.single("image_url"),
  uploadCloud.upload,
  controller.createVenuesPost,
);
router.post(
  "/venues/edit/:id",
  upload.single("image_url"),
  uploadCloud.upload,
  controller.editVenuesPost,
);
//venues
router.patch("/changeStatus/:id/:status", controller.changeStatus);
router.get("/createCourts", controller.create);
router.post(
  "/createCourts",
  upload.array("image_urls", 6), // đúng name trong create.pug
  uploadCloud.uploadMany, // đẩy lên Cloudinary → req.body.image_urls = [url, ...]
  controller.createPost, // handler lưu Court (bạn tự viết)
);
router.get("/detailCourts/:id", controller.detail);
router.get("/editCourts/:id", controller.edit);
router.post(
  "/editCourts/:id",
  upload.array("new_images", 6),
  uploadCloud.uploadMany,
  controller.editPost,
);
router.use("/price-rules", priceRuleRoute);
module.exports = router;
