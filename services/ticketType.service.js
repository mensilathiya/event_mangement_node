const TicketType = require("../models/ticketType.model");

// Create Ticket Type
const createTicketType = async (data) => {
  return await TicketType.create(data);
};
// Get All Ticket Types
const getAllTicketTypes = async ({
  eventId,
  page = 1,
  limit = 10,
  search = "",
}) => {
  const query = {
    eventId,
    isDeleted: false,
  };

  if (search) {
    query.ticketName = {
      $regex: search,
      $options: "i",
    };
  }

  const skip = (page - 1) * limit;

  const total = await TicketType.countDocuments(query);

  const ticketTypes = await TicketType.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return {
    ticketTypes,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  };
};
//update
const updateTicketType = async (id, data) => {
  return await TicketType.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
    },
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};
// delete
const deleteTicketType = async (id) => {
  return await TicketType.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
    },
    {
      isDeleted: true,
    },
    {
      new: true,
    }
  );
};
module.exports = {
  createTicketType,
  getAllTicketTypes,
  updateTicketType,
  deleteTicketType
};