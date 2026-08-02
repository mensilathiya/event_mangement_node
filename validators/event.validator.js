const { body, validationResult } = require("express-validator");

// Create Event Validation
const createEventValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required"),

  body("startDateTime")
    .notEmpty()
    .withMessage("Start Date & Time is required"),

  body("endDateTime")
    .notEmpty()
    .withMessage("End Date & Time is required"),

  body("venueName")
    .trim()
    .notEmpty()
    .withMessage("Venue Name is required"),

  body("latitude")
    .optional({ checkFalsy: true })
    .isFloat()
    .withMessage("Invalid latitude"),

  body("longitude")
    .optional({ checkFalsy: true })
    .isFloat()
    .withMessage("Invalid longitude"),

  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required"),

  body("termsConditions")
    .trim()
    .notEmpty()
    .withMessage("Terms & Conditions are required"),


  body("videoLinks")
    .optional({ checkFalsy: true })
    .custom((value) => {
      try {
        const links = JSON.parse(value);

        if (!Array.isArray(links)) {
          throw new Error();
        }

        return true;
      } catch {
        throw new Error("Video Links must be a valid JSON array");
      }
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

module.exports = {
  createEventValidation,
  validate,
};