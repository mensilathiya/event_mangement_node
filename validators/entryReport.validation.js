const { query } = require("express-validator");

const getAllEntryReportValidation = [
  query("eventId")
    .notEmpty()
    .withMessage("Event Id is required")
    .isMongoId()
    .withMessage("Invalid Event Id"),

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
    .trim(),

  query("ticketId")
    .optional()
    .trim(),

  query("mobileNumber")
    .optional()
    .trim()
    .matches(/^[0-9]{0,10}$/)
    .withMessage("Invalid mobile number"),

  query("name")
    .optional()
    .trim(),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date"),
];

module.exports = {
  getAllEntryReportValidation,
};