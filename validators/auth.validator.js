const { body } = require("express-validator");

const loginValidation = [
  body("login")
    .trim()
    .notEmpty()
    .withMessage("Email or Mobile Number is required")
    .custom((value) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isMobile = /^[0-9]{10}$/.test(value);

      if (!isEmail && !isMobile) {
        throw new Error(
          "Please enter a valid email address or 10-digit mobile number"
        );
      }

      return true;
    }),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required"),
];

module.exports = { loginValidation };