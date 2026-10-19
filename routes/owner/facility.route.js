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
router.patch("/changeStatus/:id/:status", controller.changeStatus);
router.use("/price-rules", priceRuleRoute);
module.exports = router;
