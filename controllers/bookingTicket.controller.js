const bookingTicketService = require("../services/bookingTicket.service");

// ================= REGISTER / UPDATE USER =================

const registerUser = async (req, res, next) => {
  try {
    const ticket = await bookingTicketService.registerUser(
      req.params.ticketId,
      req.body,
      req.file,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Register user updated successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  registerUser,
};