const express = require("express");
const controller = require("../../controllers/admin/report.controller");
const commission = require("../../controllers/admin/commission.controller");
const validate = require("../../validates/admin/platform-commission.validate");
const authorize = require("../../middlewares/admin/authorize.middleware");

const reconcile = express.Router();
reconcile.get("/", authorize("commission:reconcile"), controller.reconcile);
reconcile.post("/close", authorize("commission:update"), validate.close, commission.close);

const reports = express.Router();
reports.get("/", authorize("commission:report"), controller.report);

module.exports = { reconcile, reports };
