const entryReportService = require("../services/entryReport.service");

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

module.exports = {
  getAllEntryReports,
};