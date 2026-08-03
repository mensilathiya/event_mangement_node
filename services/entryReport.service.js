const BookingTicket = require("../models/bookingTicket.model");
const Booking = require("../models/booking.model");

const getAllEntryReports = async (query) => {
  let {
    page = 1,
    limit = 10,
    bookingId = "",
    mobileNumber = "",
    qrCode = "",
    name = "",
    startDate,
    endDate,
    sortBy = "scannedAt",
    sortOrder = "desc",
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {
    status: "Used",
  };

  if (bookingId) {
    filter.bookingNumber = {
      $regex: bookingId,
      $options: "i",
    };
  }

  if (qrCode) {
    filter.ticketNumber = {
      $regex: qrCode,
      $options: "i",
    };
  }

  if (mobileNumber) {
    filter["attendee.mobileNumber"] = {
      $regex: mobileNumber,
      $options: "i",
    };
  }

  if (name) {
    filter["attendee.name"] = {
      $regex: name,
      $options: "i",
    };
  }

  if (startDate || endDate) {
    filter.scannedAt = {};

    if (startDate) {
      filter.scannedAt.$gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.scannedAt.$lte = end;
    }
  }

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [rows, total] = await Promise.all([
    BookingTicket.find(filter)
      .populate({
        path: "bookingId",
        select:
          "bookingNumber quantity amount bookingStatus createdBy createdAt",
        populate: {
          path: "createdBy",
          select: "name mobile email",
        },
      })
      .populate("eventId", "title startDateTime venueName")
      .populate("ticketTypeId", "ticketName amount")
      .populate("scannedBy", "name mobile email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    BookingTicket.countDocuments(filter),
  ]);

  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getAllEntryReports,
};