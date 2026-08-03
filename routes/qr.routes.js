const express = require("express");

const router = express.Router();

const { protect } = require("../middlewares/auth.middleware");
const qrController = require("../controllers/qr.controller");
const {
  verifyQrValidation,
  checkInQrValidation,
  validate,
} = require("../validators/qr.validation");

// verfiy
router.post(
  "/verify",
  protect,
  verifyQrValidation,
  validate,
  qrController.verifyQr
);
//  check-in
router.post(
  "/check-in",
  protect,
  checkInQrValidation,
  validate,
  qrController.checkInQr
);
module.exports = router;