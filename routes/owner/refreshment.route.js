const express = require("express");
const router = express.Router();

const controller = require("../../controllers/owner/refreshment.controller");
const uploadCloud = require("../../middlewares/owner/uploadCloud.middleware");
const multer = require("multer");
const upload = multer();


router.get("/", controller.index);

router.get("/create", controller.create);

router.post("/create", upload.single("image"), uploadCloud.upload, controller.createPost);

router.get("/sales", controller.sales);

router.get("/sales/create", controller.createSale);

router.post("/sales/create", controller.createSalePost);

router.get("/sales/:id", controller.saleDetail);

router.get("/edit/:id", controller.edit);

router.patch("/edit/:id", upload.single("image"), uploadCloud.upload, controller.editPatch);

router.patch("/change-status/:id", controller.changeStatus);

module.exports = router;
