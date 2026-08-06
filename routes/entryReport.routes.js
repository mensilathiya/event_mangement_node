const express = require("express");

const router = express.Router();

const entryReportController = require("../controllers/entryReport.controller");
const { protect } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");

const {
  getAllEntryReportValidation,
  exportEntryReportValidation,
} = require("../validators/entryReport.validation");
// get all entery report
router.get(
  "/get-all-entry-report",
  protect,
  getAllEntryReportValidation,
  validate,
  entryReportController.getAllEntryReports
);
// export excel
router.get(
  "/export",
  protect,
  exportEntryReportValidation,
  validate,
  entryReportController.exportEntryReport
);
module.exports = router;