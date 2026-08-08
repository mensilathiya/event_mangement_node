const bookingService = require("../services/booking.service");

// Create Booking
const createBooking = async (req, res, next) => {
  try {
    const result = await bookingService.createBooking({
      ...req.body,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
// get all bookings
const getAllBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getAllBookings(req.query);

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: result.rows,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ================= DELETE BOOKING =================
const deleteBooking = async (req, res, next) => {
  try {
    const { remark } = req.body;

    const booking = await bookingService.deleteBooking(
      req.params.id,
      remark,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
// getbooking by id
const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};const exportBookingsController = async (req, res, next) => {
  try {
    await bookingService.exportBookings(req.query, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  deleteBooking,
  getBookingById,
  exportBookingsController,
};

