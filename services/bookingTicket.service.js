// services/bookingTicket.service.js

const BookingTicket = require("../models/bookingTicket.model");
const uploadToCloudinary = require("../utils/cloudinary.util");
const deleteFromCloudinary = require("../utils/deleteCloudinaryFile");
const AppError = require("../utils/AppError");

// ================= REGISTER / UPDATE USER =================

const registerUser = async (ticketId, data, file, userId) => {
  const ticket = await BookingTicket.findById(ticketId);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  const {
    name,
    mobileNumber,
    email,
  } = data;

  // Upload profile image if available
  if (file) {

    // Delete old image
    if (ticket.attendee.profileImagePublicId) {
      await deleteFromCloudinary(
        ticket.attendee.profileImagePublicId
      );
    }

    const upload = await uploadToCloudinary(
      file.buffer,
      "event-management/register-user"
    );

    ticket.attendee.profileImage = upload.url;
    ticket.attendee.profileImagePublicId =
      upload.public_id;
  }

  ticket.attendee.name = name;
  ticket.attendee.mobileNumber = mobileNumber;
  ticket.attendee.email = email;

  ticket.attendee.registeredAt = new Date();

  ticket.isRegistered = true;

  await ticket.save();

  return ticket;
};


module.exports = {
  registerUser,
};