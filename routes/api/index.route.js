const express = require("express");
const auth = require("../../controllers/api/auth.controller");
const profile = require("../../controllers/api/profile.controller");
const catalog = require("../../controllers/api/catalog.controller");
const booking = require("../../controllers/api/booking.controller");
const requireAuth = require("../../middlewares/api/auth.middleware");

const router = express.Router();

router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.get("/auth/me", requireAuth, auth.me);

router.get("/home", requireAuth, catalog.home);
router.get("/facilities/:id", requireAuth, catalog.detail);
router.get("/facilities/:id/slots", requireAuth, catalog.slots);
router.get("/checkout/options", requireAuth, catalog.checkoutOptions);

router.post("/bookings/quote", requireAuth, booking.quote);
router.post("/bookings", requireAuth, booking.create);
router.get("/bookings", requireAuth, booking.list);
router.post("/bookings/:code/cancel", requireAuth, booking.cancel);

router.get("/profile", requireAuth, profile.index);
router.put("/profile", requireAuth, profile.update);

module.exports = router;
