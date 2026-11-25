const express = require("express");
const controller = require("../../controllers/admin/account.controller");
const authorize = require("../../middlewares/admin/authorize.middleware");
const validate = require("../../validates/admin/admin-user.validate");

const validateAccount = require("../../validates/admin/account.validate");

const router = express.Router();

function gan(loai) {
  const base = `/${loai}`;
  router.get(base, authorize("user:view"), controller[loai === "owners" ? "owners" : "customers"]);
  router.get(`${base}/new`, authorize("user:create"), (req, res, next) => {
    req.params.loai = loai;
    return controller.form(req, res, next);
  });
  router.post(base, authorize("user:create"), (req, res, next) => {
    req.params.loai = loai;
    return validateAccount.tao(req, res, () => controller.tao(req, res, next));
  });
  router.get(`${base}/:id`, authorize("user:view"), (req, res, next) => {
    req.params.loai = loai;
    return controller.detail(req, res, next);
  });
  router.get(`${base}/:id/edit`, authorize("user:update"), (req, res, next) => {
    req.params.loai = loai;
    return controller.form(req, res, next);
  });
  router.post(`${base}/:id`, authorize("user:update"), (req, res, next) => {
    req.params.loai = loai;
    return validateAccount.sua(req, res, () => controller.sua(req, res, next));
  });
  router.post(`${base}/:id/status`, authorize("user:lock"), (req, res, next) => {
    req.params.loai = loai;
    return controller.khoa(req, res, next);
  });
  router.post(`${base}/:id/password`, authorize("user:reset_password"), (req, res, next) => {
    req.params.loai = loai;
    return validateAccount.matKhau(req, res, () => controller.matKhau(req, res, next));
  });
  router.post(`${base}/:id/delete`, authorize("user:update"), (req, res, next) => {
    req.params.loai = loai;
    return controller.xoa(req, res, next);
  });
}

gan("owners");
gan("customers");

const admins = express.Router();
admins.get("/", authorize("admin:view"), controller.admins);
admins.post("/", authorize("user:create"), validate.create, controller.createAdmin);
admins.post("/:id/delete", authorize("system:override"), controller.removeAdmin);

const profile = express.Router();
profile.get("/", authorize("account:profile"), controller.profile);
profile.post("/", authorize("account:profile"), controller.saveProfile);
profile.post("/password", authorize("account:profile"), controller.changePassword);

module.exports = router;
module.exports.admins = admins;
module.exports.profile = profile;
