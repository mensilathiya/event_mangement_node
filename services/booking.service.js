const Booking = require("../models/booking.model");
const Event = require("../models/event.model");
const TicketType = require("../models/ticketType.model");
const Counter = require("../models/counters.model");
const BookingTicket = require("../models/bookingTicket.model");
const generateTicketNumber = require("../utils/generateTicketNumber");
const generateQrToken = require("../utils/generateQrToken");
const generateQrCode = require("../utils/generateQrCode");
const uploadToCloudinary = require("../utils/cloudinary.util");
const AppError = require("../utils/AppError");
const mongoose = require("mongoose");
// booking number
const generateBookingNumber = async (session) => {
  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { name: `BOOKING_${year}` },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      session
    }
  );

  return `BK${year}${String(counter.sequence).padStart(6, "0")}`;
};

// post api
const createBooking = async (data) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      eventId,
      ticketTypeId,
      quantity,
      amount,
      name,
      mobileNumber,
      email,
      discount,
      remark,
      createdBy
    } = data;

    const bookingQuantity = Number(quantity);
    const bookingAmount = Number(amount);
    const discountAmount = Number(discount || 0);
    if (bookingQuantity <= 0) {
      throw new AppError("Invalid booking quantity", 400);
    }

    if (bookingAmount < 0) {
      throw new AppError("Invalid booking amount", 400);
    }
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      throw new AppError("Event not found", 404);
    }
    if (!event.isActive) {
      throw new AppError(
        "Booking cannot be created because the event is inactive.",
        400
      );
    }
    const ticketType = await TicketType.findOneAndUpdate(
      {
        _id: ticketTypeId,
        eventId: eventId,
        isDeleted: false,
        availableCount: {
          $gte: bookingQuantity
        }
      },
      {
        $inc: {
          availableCount: -bookingQuantity
        }
      },
      {
        new: true,
        session
      }
    );

    if (!ticketType) {
      throw new AppError("Ticket not available", 400);
    }

    const expectedAmount =
      (ticketType.amount * bookingQuantity) - discountAmount;

    if (bookingAmount !== expectedAmount) {
      throw new AppError(
        `Invalid booking amount. Expected amount is ${expectedAmount}`,
        400
      );
    }

    const bookingNumber = await generateBookingNumber(session);

    const booking = await Booking.create(
      [
        {
          bookingNumber,
          eventId,
          ticketTypeId,
          quantity: bookingQuantity,
          amount: bookingAmount,
          name,
          mobileNumber,
          email,
          discount: discountAmount,
          remark,
          createdBy
        }
      ],
      { session }
    );

    const bookingTickets = [];

    for (let i = 0; i < bookingQuantity; i++) {
      // Generate Ticket Number
      const ticketNumber = await generateTicketNumber(session);

      // Generate JWT Token
      const qrToken = generateQrToken({
        ticketNumber,
      });

      // Generate QR Buffer
      const qrBuffer = await generateQrCode(qrToken);

      // Upload QR to Cloudinary
      const qrUpload = await uploadToCloudinary(
        qrBuffer,
        "event-management/qr-codes"
      );

      bookingTickets.push({
        bookingId: booking[0]._id,
        eventId,
        ticketTypeId,
        bookingNumber: booking[0].bookingNumber,
        ticketNumber,
        qrToken,
        qrImage: qrUpload.url,
        qrImagePublicId: qrUpload.public_id,
        status: "Active",
      });
    }

    const insertedTickets = await BookingTicket.insertMany(
      bookingTickets,
      { session }
    );

    await session.commitTransaction();

    return {
      booking: booking[0],
      tickets: insertedTickets,
      totalTickets: insertedTickets.length,
    };

  } catch (error) {
    console.error("Create Booking Error:", error);

    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ================= GET ALL BOOKINGS =================
const getAllBookings = async (query) => {
  const {
    page = 1,
    limit = 10,
    bookingId,
    mobileNumber,
    name,
    createdBy,
    status,
    fromDate,
    toDate,
    search,
  } = query;

  // ================= CONVERT PAGINATION VALUES =================
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.max(Number(limit) || 10, 1);

  // ================= FIND ACTIVE EVENT =================
  const activeEvent = await Event.findOne({
    isActive: true,
  }).select("_id title startDateTime endDateTime");

  // ================= NO ACTIVE EVENT =================
  if (!activeEvent) {
    return {
      event: null,
      rows: [],
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  // ================= BUILD FILTER =================
  const filter = {
    eventId: activeEvent._id,
  };

  // ================= DELETED / SUCCESS STATUS =================
  if (status === "Deleted") {
    filter.isDeleted = true;
  } else {
    // Default + Success
    filter.isDeleted = false;
  }

  // ================= BOOKING ID FILTER =================
  if (bookingId?.trim()) {
    filter.bookingNumber = {
      $regex: bookingId.trim(),
      $options: "i",
    };
  }

  // ================= MOBILE NUMBER FILTER =================
  if (mobileNumber?.trim()) {
    filter.mobileNumber = {
      $regex: mobileNumber.trim(),
      $options: "i",
    };
  }

  // ================= NAME FILTER =================
  if (name?.trim()) {
    filter.name = {
      $regex: name.trim(),
      $options: "i",
    };
  }

  // ================= CREATED BY FILTER =================
  if (createdBy) {
    filter.createdBy = createdBy;
  }

  // ================= GLOBAL SEARCH FILTER =================
  if (search?.trim()) {
    const searchValue = search.trim();

    filter.$or = [
      {
        bookingNumber: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        name: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        mobileNumber: {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];
  }

  // ================= DATE FILTER =================
  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      const startDate = new Date(fromDate);

      if (!Number.isNaN(startDate.getTime())) {
        startDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDate;
      }
    }

    if (toDate) {
      const endDate = new Date(toDate);

      if (!Number.isNaN(endDate.getTime())) {
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Remove empty createdAt filter
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  // ================= TOTAL COUNT =================
  const total = await Booking.countDocuments(filter);

  // ================= TOTAL PAGES =================
  const totalPages = Math.ceil(total / pageLimit);

  // ================= PAGINATION OFFSET =================
  const skip = (currentPage - 1) * pageLimit;

  // ================= FETCH BOOKINGS =================
  const bookings = await Booking.find(filter)
    .populate(
      "eventId",
      "title startDateTime endDateTime"
    )
    .populate(
      "ticketTypeId",
      "ticketName amount"
    )
    .populate(
      "createdBy",
      "name"
    )
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  // ================= RESPONSE =================
  return {
    event: activeEvent,
    rows: bookings,
    pagination: {
      page: currentPage,
      limit: pageLimit,
      total,
      totalPages,
    },
  };
};
// ================= DELETE BOOKING =================
const deleteBooking = async (bookingId, remark, deletedBy) => {
  if (!remark || !remark.trim()) {
    throw new AppError("Delete remark is required", 400);
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.isDeleted) {
    throw new AppError("Booking already deleted", 400);
  }

  booking.isDeleted = true;
  booking.deleteRemark = remark.trim();
  booking.deletedAt = new Date();
  booking.deletedBy = deletedBy;

  await booking.save();

  return booking;
};
// ================= EXPORT ALL BOOKINGS =================
const exportBookings = async (query, res) => {
  const {
    bookingId,
    mobileNumber,
    name,
    createdBy,
    status,
    fromDate,
    toDate,
    search,
  } = query;

  // ================= FIND ACTIVE EVENT =================
  const activeEvent = await Event.findOne({
    isActive: true,
  }).select("_id title startDateTime endDateTime");

  if (!activeEvent) {
    throw new AppError("No active event found.", 404);
  }

  // ================= BUILD FILTER =================
  const filter = {
    eventId: activeEvent._id,
  };

  // ================= DELETED / SUCCESS STATUS =================
  if (status === "Deleted") {
    filter.isDeleted = true;
  } else {
    // Default + Success
    filter.isDeleted = false;
  }

  // ================= BOOKING ID FILTER =================
  if (bookingId?.trim()) {
    filter.bookingNumber = {
      $regex: bookingId.trim(),
      $options: "i",
    };
  }

  // ================= MOBILE NUMBER FILTER =================
  if (mobileNumber?.trim()) {
    filter.mobileNumber = {
      $regex: mobileNumber.trim(),
      $options: "i",
    };
  }

  // ================= NAME FILTER =================
  if (name?.trim()) {
    filter.name = {
      $regex: name.trim(),
      $options: "i",
    };
  }

  // ================= CREATED BY FILTER =================
  if (createdBy) {
    filter.createdBy = createdBy;
  }

  // ================= GLOBAL SEARCH FILTER =================
  if (search?.trim()) {
    const searchValue = search.trim();

    filter.$or = [
      {
        bookingNumber: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        name: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        mobileNumber: {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];
  }

  // ================= DATE FILTER =================
  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      const startDate = new Date(fromDate);

      if (!Number.isNaN(startDate.getTime())) {
        startDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDate;
      }
    }

    if (toDate) {
      const endDate = new Date(toDate);

      if (!Number.isNaN(endDate.getTime())) {
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Remove empty createdAt filter
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  // ================= FETCH ALL BOOKINGS =================
  const bookings = await Booking.find(filter)
    .populate(
      "eventId",
      "title startDateTime endDateTime"
    )
    .populate(
      "ticketTypeId",
      "ticketName amount"
    )
    .populate(
      "createdBy",
      "name"
    )
    .sort({
      createdAt: -1,
    })
    .lean();

  // ================= WORKBOOK =================
  const ExcelJS = require("exceljs");

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Event Management CRM";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Booking Report");

  worksheet.columns = [
    {
      header: "Booking Id",
      key: "bookingId",
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
      header: "Email",
      key: "email",
      width: 30,
    },
    {
      header: "Event",
      key: "event",
      width: 25,
    },
    {
      header: "Ticket Type",
      key: "ticketType",
      width: 22,
    },
    {
      header: "Quantity",
      key: "quantity",
      width: 12,
    },
    {
      header: "Amount",
      key: "amount",
      width: 15,
    },
    {
      header: "Discount",
      key: "discount",
      width: 15,
    },
    {
      header: "Created By",
      key: "createdBy",
      width: 22,
    },
    {
      header: "Remark",
      key: "remark",
      width: 30,
    },
    {
      header: "Created At",
      key: "createdAt",
      width: 22,
    },
    {
      header: "Status",
      key: "status",
      width: 15,
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
  bookings.forEach((item) => {
    worksheet.addRow({
      bookingId: item.bookingNumber || "-",

      name: item.name || "-",

      mobile: item.mobileNumber || "-",

      email: item.email || "-",

      event: item.eventId?.title || "-",

      ticketType: item.ticketTypeId?.ticketName || "-",

      quantity: item.quantity ?? 0,

      amount: item.amount ?? 0,

      discount: item.discount ?? 0,

      createdBy: item.createdBy?.name || "-",

      remark: item.remark || "-",

      createdAt: item.createdAt
        ? new Date(item.createdAt).toLocaleString("en-GB")
        : "-",

      status: item.isDeleted ? "Deleted" : "Success",
    });
  });

  // ================= DOWNLOAD =================
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=BookingReport_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);

  res.end();
};
// get booking by id
// ================= GET BOOKING BY ID =================
const getBookingById = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate(
      "eventId",
      "title startDateTime endDateTime venueName image address"
    )
    .populate(
      "ticketTypeId",
      "ticketName amount"
    )
    .populate(
      "createdBy",
      "name email"
    );

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  const tickets = await BookingTicket.find({
    bookingId: booking._id,
  })
    .select("-qrToken -qrImagePublicId -__v")
    .sort({ createdAt: 1 });

  return {
    ...booking.toObject(),
    tickets,
  };
};
module.exports = {
  createBooking,
  getAllBookings,
  deleteBooking,
  getBookingById,
  exportBookings
};