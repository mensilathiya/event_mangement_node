const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/booking.controller");

const {
  createBookingValidation,
  validate,
} = require("../validators/booking.validator");
const { protect } = require("../middlewares/auth.middleware");

// Create Booking
router.post(
  "/create",
  protect,
  createBookingValidation,
  validate,
  bookingController.createBooking
);

// Get All Bookings
router.get(
    "/get-all-bookings",
    protect,
    bookingController.getAllBookings
);
// delete bookings
router.delete(
  "/delete/:id",
  protect,
  bookingController.deleteBooking
);
// get all booking by id
router.get(
  "/:id",
  protect,
  bookingController.getBookingById
);
module.exports = router;