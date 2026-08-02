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
        bookingId: booking[0]._id,
        bookingNumber: booking[0].bookingNumber,
        ticketNumber,
        eventId,
        ticketTypeId,
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

// get all booking
const getAllBookings = async (query) => {
  const {
    page = 1,
    limit = 10,
    bookingId,
    mobileNumber,
    name,
    eventId,
    createdBy,
    status,
    fromDate,
    toDate,
  } = query;

  const filter = { isDeleted: false, };

  if (bookingId) {
    filter.bookingNumber = { $regex: bookingId, $options: "i" };
  }

  if (mobileNumber) {
    filter.mobileNumber = { $regex: mobileNumber, $options: "i" };
  }

  if (name) {
    filter.name = { $regex: name, $options: "i" };
  }

  if (eventId) {
    filter.eventId = eventId;
  }

  if (createdBy) {
    filter.createdBy = createdBy;
  }

  if (status === "Success") {
    filter.isDeleted = false;
  }

  if (status === "Deleted") {
    filter.isDeleted = true;
  }

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const total = await Booking.countDocuments(filter);

  const bookings = await Booking.find(filter)
    .populate("eventId", "title startDateTime")
    .populate("ticketTypeId", "ticketName amount")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return {
    bookings,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
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
  getBookingById
};
