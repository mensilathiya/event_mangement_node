const BookingTicket = require("../models/bookingTicket.model");
const Event = require("../models/event.model");
const getAllEntryReports = async (query) => {
  let {
    eventId,
    page = 1,
    limit = 10,
    bookingId = "",
    ticketId = "",
    mobileNumber = "",
    name = "",
    startDate,
    endDate,
  } = query;

  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;

  const skip = (page - 1) * limit;

  const filter = {
    eventId,
    status: "Used",
  };

  if (bookingId) {
    filter.bookingNumber = {
      $regex: bookingId,
      $options: "i",
    };
  }

  if (ticketId) {
    filter.ticketNumber = {
      $regex: ticketId,
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
      const lastDate = new Date(endDate);
      lastDate.setHours(23, 59, 59, 999);
      filter.scannedAt.$lte = lastDate;
    }
  }

  const [event, tickets, total] = await Promise.all([

    Event.findById(eventId)
      .select("name startDateTime endDateTime")
      .lean(),

    BookingTicket.find(filter)
      .populate({
        path: "eventId",
        select: "startDateTime endDateTime"
      })
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    BookingTicket.countDocuments(filter),

  ]);

  const rows = tickets.map((ticket) => ({
    _id: ticket._id,

    profileImage: ticket.attendee?.profileImage || "",

    bookingId: ticket.bookingNumber,

    ticketId: ticket.ticketNumber,

    qrImage: ticket.qrImage,

    name: ticket.attendee?.name || "-",

    mobileNumber: ticket.attendee?.mobileNumber || "-",

    passDate: ticket.eventId?.startDateTime || null,

    scannedAt: ticket.scannedAt,
  }));

  return {
    event,
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