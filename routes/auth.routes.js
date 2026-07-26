const express = require("express");
const router = express.Router();

const { login, getProfile, } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validate.middleware");
const { loginValidation } = require("../validators/auth.validator");

// @route   POST /api/auth/login
router.post("/login", loginValidation, validateRequest, login);

// @route   GET /api/auth/profile
router.get("/profile", protect, getProfile);

module.exports = router;
