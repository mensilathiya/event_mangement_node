const { body, validationResult } = require("express-validator");

exports.verifyQrValidation = [
  body("qrToken")
    .notEmpty()
    .withMessage("QR Token is required")
    .isString()
    .withMessage("QR Token must be a string")
    .trim(),
];

exports.validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: errors.array(),
    });
  }

  next();
};