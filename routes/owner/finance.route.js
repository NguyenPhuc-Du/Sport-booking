const express = require("express");
const router = express.Router();
const controller = require("../../controllers/owner/finance.controller");
const voucherValidate = require("../../validates/admin/voucher.validates");
const campaignValidate = require("../../validates/owner/campaign.validate");

router.get("/", controller.index);

router.get("/campaigns/create", controller.createCampaign);
router.post(
  "/campaigns/create",
  campaignValidate.createPost,
  controller.createCampaignPost,
);
router.get("/campaigns/edit/:id", controller.editCampaign);
router.patch(
  "/campaigns/edit/:id",
  campaignValidate.editPatch,
  controller.editCampaignPatch,
);
router.delete("/campaigns/delete/:id", controller.deleteCampaign);

router.get("/campaigns/:id/vouchers", controller.vouchersIndex);
router.get("/campaigns/:id/vouchers/create", controller.create);
router.post(
  "/create",
  voucherValidate.creatPost,
  controller.createPost,
);

router.delete("/delete/:id", controller.delete);
router.get("/edit/:id", controller.edit);
router.patch("/edit/:id", voucherValidate.editPatch, controller.editPatch);

module.exports = router;
