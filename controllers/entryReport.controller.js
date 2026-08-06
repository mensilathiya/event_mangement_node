const entryReportService = require("../services/entryReport.service");
// get all entery report
const getAllEntryReports = async (req, res, next) => {
  try {
    const result = await entryReportService.getAllEntryReports(req.query);

    return res.status(200).json({
      success: true,
      message: "Entry report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
// export entery report
const exportEntryReport = async (req, res, next) => {
  try {
    await entryReportService.exportEntryReport(req.query, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEntryReports,
  exportEntryReport,
};
