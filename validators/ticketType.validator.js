const { body, validationResult } = require("express-validator");

// Create Ticket Type Validation
const createTicketTypeValidation = [
  body("eventId")
    .notEmpty()
    .withMessage("Event Id is required"),

  body("ticketName")
    .trim()
    .notEmpty()
    .withMessage("Ticket Name is required"),

  body("allowDayCount")
    .notEmpty()
    .withMessage("Allow Day Count is required")
    .isInt({ min: 1 })
    .withMessage("Allow Day Count must be a number"),

  body("allowDates")
    .isArray({ min: 1 })
    .withMessage("At least one Allow Date is required"),

  body("allowDates.*")
    .isISO8601()
    .withMessage("Invalid Allow Date"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a valid number"),

  body("availableCount")
    .notEmpty()
    .withMessage("Available Count is required")
    .isInt({ min: 0 })
    .withMessage("Available Count must be a number"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required"),

  // Custom Validation
  body("allowDates").custom((allowDates, { req }) => {
    const allowDayCount = Number(req.body.allowDayCount);

    if (allowDates.length !== allowDayCount) {
      throw new Error(
        `Allow Day Count (${allowDayCount}) must match the selected dates (${allowDates.length}).`
      );
    }

    const uniqueDates = new Set(
      allowDates.map((date) => new Date(date).toISOString().split("T")[0])
    );

    if (uniqueDates.size !== allowDates.length) {
      throw new Error("Duplicate Allow Dates are not allowed.");
    }

    return true;
  }),
];

// Validation Result
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation Failed",
      errors: errors.array(),
    });
  }

  next();
};
// update
const updateTicketTypeValidation = [
  body("ticketName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Ticket Name is required"),

  body("allowDayCount")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Allow Day Count must be a number"),

  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount must be a valid number"),

  body("allowDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid Allow Date"),

  body("availableCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Available Count must be a number"),

  body("description")
    .optional()
    .trim(),
];
module.exports = {
  createTicketTypeValidation,
  updateTicketTypeValidation,
    validate,
};