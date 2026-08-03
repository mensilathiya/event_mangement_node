const express = require("express");

const router = express.Router();

const entryReportController = require("../controllers/entryReport.controller");
const { protect } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");

const {
  getAllEntryReportValidation,
} = require("../validators/entryReport.validation");

router.get(
  "/get-all-entry-report",
  protect,
  getAllEntryReportValidation,
  validate,
  entryReportController.getAllEntryReports
);

module.exports = router;