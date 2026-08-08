const BookingTicket = require("../models/bookingTicket.model");
const Event = require("../models/event.model");
const ExcelJS = require("exceljs");

// ================= GET ALL ENTRY REPORT =================
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

  // ================= ACTIVE EVENT =================

  if (!eventId) {
    const activeEvent = await Event.findOne({
      isActive: true,
    })
      .select("_id startDateTime endDateTime")
      .lean();

    if (!activeEvent) {
      throw new Error("No active event found.");
    }

    eventId = activeEvent._id;
  }

  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;

  const skip = (page - 1) * limit;

  // ================= FILTER =================

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

  // ================= FETCH DATA =================

  const [event, tickets, total] = await Promise.all([
    Event.findById(eventId)
      .select("name title startDateTime endDateTime")
      .lean(),

    BookingTicket.find(filter)
      .populate({
        path: "eventId",
        select: "startDateTime endDateTime",
      })
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    BookingTicket.countDocuments(filter),
  ]);

  // ================= FORMAT ROWS =================

  const rows = tickets.map((ticket) => ({
    _id: ticket._id,

    profileImage: ticket.attendee?.profileImage || "",

    bookingId: ticket.bookingNumber,

    ticketId: ticket.ticketNumber,

    qrImage: ticket.qrImage || "",

    name: ticket.attendee?.name || "-",

    mobileNumber: ticket.attendee?.mobileNumber || "-",

    passDate: ticket.eventId?.startDateTime || null,

    scannedAt: ticket.scannedAt || null,
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

// ================= EXPORT ENTRY REPORT =================

const exportEntryReport = async (query, res) => {
  let {
    eventId,
    bookingId = "",
    ticketId = "",
    name = "",
    mobileNumber = "",
    startDate,
    endDate,
  } = query;

  // ================= ACTIVE EVENT =================

  if (!eventId) {
    const activeEvent = await Event.findOne({
      isActive: true,
    })
      .select("_id name title startDateTime endDateTime")
      .lean();

    if (!activeEvent) {
      throw new Error("No active event found.");
    }

    eventId = activeEvent._id;
  }

  // ================= FILTER =================

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

  if (name) {
    filter["attendee.name"] = {
      $regex: name,
      $options: "i",
    };
  }

  if (mobileNumber) {
    filter["attendee.mobileNumber"] = {
      $regex: mobileNumber,
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

  // ================= DATA =================

  const rows = await BookingTicket.find(filter)
    .select(`
      bookingNumber
      ticketNumber
      qrImage
      scannedAt
      createdAt
      attendee
    `)
    .sort({ scannedAt: -1 })
    .lean();

  // ================= WORKBOOK =================

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Event Management CRM";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Entry Report");

  worksheet.columns = [
    {
      header: "Booking Id",
      key: "bookingId",
      width: 22,
    },
    {
      header: "Ticket Id",
      key: "ticketId",
      width: 22,
    },
    {
      header: "Name",
      key: "name",
      width: 25,
    },
    {
      header: "Mobile Number",
      key: "mobile",
      width: 18,
    },
    {
      header: "Pass Date",
      key: "passDate",
      width: 22,
    },
    {
      header: "Scanned At",
      key: "scannedAt",
      width: 24,
    },
    {
      header: "QR Image",
      key: "qrImage",
      width: 45,
    },
    {
      header: "Profile Image",
      key: "profileImage",
      width: 45,
    },
  ];

  // ================= HEADER STYLE =================

  worksheet.getRow(1).font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "1F4E78",
    },
  };

  worksheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // ================= ROWS =================

  rows.forEach((item) => {
    worksheet.addRow({
      bookingId: item.bookingNumber,

      ticketId: item.ticketNumber,

      name: item.attendee?.name || "-",

      mobile: item.attendee?.mobileNumber || "-",

      passDate: item.createdAt
        ? new Date(item.createdAt).toLocaleDateString("en-GB")
        : "-",

      scannedAt: item.scannedAt
        ? new Date(item.scannedAt).toLocaleString("en-GB")
        : "-",

      qrImage: item.qrImage || "-",

      profileImage: item.attendee?.profileImage || "-",
    });
  });

  // ================= DOWNLOAD =================

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=EntryReport_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);

  res.end();
};

module.exports = {
  getAllEntryReports,
  exportEntryReport,
};