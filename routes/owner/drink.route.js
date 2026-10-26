const express = require("express");
const router = express.Router();

const controller = require("../../controllers/owner/drink.controller");
const supplierController = require("../../controllers/owner/supplier.controller");
const receiptController = require("../../controllers/owner/stock-receipt.controller");
const uploadCloud = require("../../middlewares/owner/uploadCloud.middleware");
const multer = require("multer");
const upload = multer();


router.get("/", controller.index);

router.get("/create", controller.create);

router.post("/create", upload.single("image"), uploadCloud.upload, controller.createPost);

router.get("/suppliers", supplierController.index);
router.get("/suppliers/create", supplierController.create);
router.post("/suppliers/create", supplierController.createPost);
router.get("/suppliers/edit/:id", supplierController.edit);
router.patch("/suppliers/edit/:id", supplierController.editPatch);
router.patch("/suppliers/change-status/:id", supplierController.changeStatus);

router.get("/receipts", receiptController.index);
router.get("/receipts/create", receiptController.create);
router.post("/receipts/create", receiptController.createPost);
router.post("/receipts/:id/cancel", receiptController.cancel);
router.get("/receipts/:id", receiptController.detail);

router.get("/sales", controller.sales);

router.get("/sales/create", controller.createSale);

router.post("/sales/create", controller.createSalePost);

router.get("/sales/:id", controller.saleDetail);

router.get("/edit/:id", controller.edit);

router.patch("/edit/:id", upload.single("image"), uploadCloud.upload, controller.editPatch);

router.patch("/change-status/:id", controller.changeStatus);

module.exports = router;
