const express = require("express");
const auth = require("../../controllers/api/auth.controller");
const profile = require("../../controllers/api/profile.controller");
const facility = require("../../controllers/api/facility.controller");
const booking = require("../../controllers/api/booking.controller");
const payment = require("../../controllers/api/payment.controller");
const requireAuth = require("../../middlewares/api/auth.middleware");

const router = express.Router();

router.post("/auth/register", auth.register);
router.post("/auth/register/verify", auth.registerVerify);
router.post("/auth/otp/resend", auth.resendOtp);
router.post("/auth/password/forgot", auth.forgotPassword);
router.post("/auth/password/reset", auth.resetPassword);
router.post("/auth/login", auth.login);
router.get("/auth/me", requireAuth, auth.me);

router.get("/home", requireAuth, facility.home);
router.get("/facilities/:id", requireAuth, facility.detail);
router.get("/facilities/:id/slots", requireAuth, facility.slots);
router.get("/checkout/options", requireAuth, facility.checkoutOptions);

router.post("/bookings/quote", requireAuth, booking.quote);
router.post("/bookings", requireAuth, booking.create);
router.get("/bookings", requireAuth, booking.list);
router.post("/bookings/:code/cancel", requireAuth, booking.cancel);

router.get("/payments/vnpay/return", payment.vnpayReturn);
router.get("/payments/vnpay/ipn", payment.vnpayIpn);

router.get("/profile", requireAuth, profile.index);
router.put("/profile", requireAuth, profile.update);

module.exports = router;