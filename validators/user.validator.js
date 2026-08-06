const { body, validationResult } = require("express-validator");

// Create User Validation
const createUserValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid mobile number"),

  body("email")
    .optional({ values: "falsy" })
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Invalid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm Password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password and Confirm Password do not match");
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

module.exports = {
  createUserValidation,
  validate,
};