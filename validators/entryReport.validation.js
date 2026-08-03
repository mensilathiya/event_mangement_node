const { query } = require("express-validator");

const getAllEntryReportValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("bookingId")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Booking Id is too long"),

  query("mobileNumber")
    .optional()
    .trim()
    .matches(/^[0-9]{0,10}$/)
    .withMessage("Invalid mobile number"),

  query("qrCode")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("QR Code is too long"),

  query("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name is too long"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date"),

  query("sortBy")
    .optional()
    .isIn([
      "scannedAt",
      "bookingNumber",
      "ticketNumber",
      "createdAt",
    ])
    .withMessage("Invalid sortBy field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),
];

module.exports = {
  getAllEntryReportValidation,
};