const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  createBooking, verifyOtp, resendOtp, listBookings, updateBookingStatus, deleteBooking,
} = require("../controllers/bookingController");
const { validateBooking, requireAdminKey } = require("../middleware/validate");

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: "Слишком много заявок. Попробуйте позже." },
});
const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: "Слишком много попыток. Попробуйте позже." },
});
const resendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: "Слишком много повторных отправок. Попробуйте позже." },
});

router.post("/", submitLimiter, validateBooking, createBooking);
router.post("/:id/verify-otp", verifyLimiter, verifyOtp);
router.post("/:id/resend-otp", resendLimiter, resendOtp);

router.get("/", requireAdminKey, listBookings);
router.patch("/:id/status", requireAdminKey, updateBookingStatus);
router.delete("/:id", requireAdminKey, deleteBooking);

module.exports = router;
