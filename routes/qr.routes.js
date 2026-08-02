const express = require("express");

const router = express.Router();

const { protect } = require("../middlewares/auth.middleware");
const qrController = require("../controllers/qr.controller");
const {
  verifyQrValidation,
  validate,
} = require("../validations/qr.validation");

router.post(
  "/verify",
  protect,
  verifyQrValidation,
  validate,
  qrController.verifyQr
);

module.exports = router;