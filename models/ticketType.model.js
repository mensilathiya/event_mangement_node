const mongoose = require("mongoose");

const ticketTypeSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    ticketName: {
      type: String,
      required: true,
      trim: true,
    },

    allowDayCount: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    allowDate: {
      type: Date,
      default: null,
    },

    availableCount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TicketType", ticketTypeSchema);