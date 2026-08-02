const mongoose = require("mongoose");

const bookingTicketSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketType",
      required: true,
    },

    bookingNumber: {
      type: String,
      required: true,
      index: true,
    },

    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    qrToken: {
      type: String,
      required: true,
    },

    qrImage: {
      type: String,
      default: "",
    },

    qrImagePublicId: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Used", "Cancelled","Expired"],
      default: "Active",
      index: true,
    },

    scannedAt: {
      type: Date,
      default: null,
    },

    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // ================= REGISTER USER =================

    isRegistered: {
      type: Boolean,
      default: false,
    },

    attendee: {
      name: {
        type: String,
        trim: true,
        default: "",
      },

      mobileNumber: {
        type: String,
        trim: true,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      profileImage: {
        type: String,
        default: "",
      },

      profileImagePublicId: {
        type: String,
        default: "",
      },

      registeredAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BookingTicket", bookingTicketSchema);