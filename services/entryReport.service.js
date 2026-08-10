const BookingTicket = require("../models/bookingTicket.model");
const Event = require("../models/event.model");
const ExcelJS = require("exceljs");

// Shared search fields for the toolbar "quick search" — Booking Id, Ticket
// Id, QR Code, Name, Mobile Number, per the Entry Report spec. Used by both
// getAllEntryReports and exportEntryReport so search behaves identically
// in the table and in the exported file.
const buildSearchOr = (search) => [
  { bookingNumber: { $regex: search, $options: "i" } },
  { ticketNumber: { $regex: search, $options: "i" } },
  { qrImage: { $regex: search, $options: "i" } },
  { "attendee.name": { $regex: search, $options: "i" } },
  { "attendee.mobileNumber": { $regex: search, $options: "i" } },
];

// Applies the end-of-day boundary in UTC explicitly. setHours() would
// apply the Node process's local timezone, which can shift the boundary
// by that offset and cause off-by-one-day results depending on where the
// server runs. startDate/endDate arrive as "YYYY-MM-DD" (date-only ISO),
// which `new Date(...)` already parses as UTC midnight, so pairing it
// with setUTCHours keeps both ends of the range in the same timezone.
const endOfDayUtc = (dateStr) => {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

// ================= GET ALL ENTRY REPORT =================
const getAllEntryReports = async (query) => {
  let {
    page = 1,
    limit = 10,
    bookingId = "",
    ticketId = "",
    mobileNumber = "",
    name = "",
    search = "",
    startDate,
    endDate,
  } = query;

  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;
  const skip = (page - 1) * limit;

  // ================= ACTIVE EVENT =================
  // Always resolved server-side from the currently active event. A client-
  // supplied eventId is never trusted here, so Entry Report can never
  // return records from an inactive/unrelated event even if a stale or
  // forged eventId were sent from the frontend.
  //
  // "Active" requires BOTH isActive === true AND endDateTime not yet
  // passed, checked against the current time on every request. isActive
  // stays a manually controlled flag (never written here); endDateTime is
  // what makes this time-accurate without a cron job or scheduler.
  const now = new Date();

  const activeEvent = await Event.findOne({
    isActive: true,
    endDateTime: { $gte: now },
  })
    .select("_id name title startDateTime endDateTime")
    .lean();

  if (!activeEvent) {
    // No active event: respond gracefully so the UI can show its normal
    // empty state instead of an error.
    return {
      event: null,
      rows: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const eventId = activeEvent._id;

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

  // Toolbar quick-search — combines with the specific field filters above
  // (Mongo ANDs every top-level key, including $or), so Search-button
  // filters and toolbar search apply together correctly.
  if (search) {
    filter.$or = buildSearchOr(search);
  }

  if (startDate || endDate) {
    filter.scannedAt = {};

    if (startDate) {
      filter.scannedAt.$gte = new Date(startDate);
    }

    if (endDate) {
      filter.scannedAt.$lte = endOfDayUtc(endDate);
    }
  }

  // ================= FETCH DATA =================

  const [tickets, total] = await Promise.all([
    BookingTicket.find(filter)
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

    passDate: activeEvent.startDateTime || null,

    scannedAt: ticket.scannedAt || null,
  }));

  return {
    event: activeEvent,

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
    bookingId = "",
    ticketId = "",
    name = "",
    mobileNumber = "",
    search = "",
    startDate,
    endDate,
  } = query;

  // ================= ACTIVE EVENT =================
  // Same server-side enforcement as getAllEntryReports — export always
  // targets the currently active event, never a client-supplied eventId,
  // and "active" requires both isActive === true and endDateTime not yet
  // passed, checked against the current time on every request.
  const now = new Date();

  const activeEvent = await Event.findOne({
    isActive: true,
    endDateTime: { $gte: now },
  })
    .select("_id name title startDateTime endDateTime")
    .lean();

  if (!activeEvent) {
    throw new Error("No active event found.");
  }

  const eventId = activeEvent._id;

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

  if (search) {
    filter.$or = buildSearchOr(search);
  }

  if (startDate || endDate) {
    filter.scannedAt = {};

    if (startDate) {
      filter.scannedAt.$gte = new Date(startDate);
    }

    if (endDate) {
      filter.scannedAt.$lte = endOfDayUtc(endDate);
    }
  }

  // ================= DATA =================

  const rows = await BookingTicket.find(filter)
    .select(`
      bookingNumber
      ticketNumber
      qrImage
      scannedAt
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
  // Pass Date reflects the active event's own date (same source used by
  // getAllEntryReports), rather than each ticket's createdAt, so the
  // exported file and the on-screen table always agree.

  rows.forEach((item) => {
    worksheet.addRow({
      bookingId: item.bookingNumber,

      ticketId: item.ticketNumber,

      name: item.attendee?.name || "-",

      mobile: item.attendee?.mobileNumber || "-",

      passDate: activeEvent.startDateTime
        ? new Date(activeEvent.startDateTime).toLocaleDateString("en-GB")
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