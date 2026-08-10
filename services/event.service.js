const Event = require("../models/event.model");
const TicketType = require("../models/ticketType.model");
const uploadToCloudinary = require("../utils/cloudinary.util");

// Create Event
exports.createEvent = async (data, file, adminId) => {
  let imageUrl = "";
  let imagePublicId = "";

  if (file) {
    const uploadedImage = await uploadToCloudinary(
      file.buffer,
      "event-management/events"
    );

    imageUrl = uploadedImage.url;
    imagePublicId = uploadedImage.public_id;
  }

  const event = await Event.create({
    title: data.title,
    description: data.description,
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    venueName: data.venueName,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
    termsConditions: data.termsConditions,
    videoLinks: data.videoLinks ? JSON.parse(data.videoLinks) : [],
    image: imageUrl,
    imagePublicId: imagePublicId,
    createdBy: adminId || null,
  });

  return event;
};

// Get Event By Id
exports.getEventById = async (id) => {
  const event = await Event.findById(id)
    .populate("createdBy", "name")
    .lean();

  if (!event) {
    return null;
  }

  const tickets = await TicketType.find(
    { eventId: id, isDeleted: false },
    { ticketName: 1, _id: 0 }
  );

  return {
    ...event,
    ticketTypes: tickets.map((ticket) => ticket.ticketName),
  };
};

// Get All Events
exports.getAllEvents = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const search = query.search || "";

  const filter = {};

  if (search) {
    filter.title = {
      $regex: search,
      $options: "i",
    };
  }

  const total = await Event.countDocuments(filter);

  const events = await Event.find(filter)
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    success: true,
    message: "Events fetched successfully.",
    data: events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Change Event Status
exports.changeEventStatus = async (id) => {
  const event = await Event.findById(id);

  if (!event) {
    throw new Error("Event not found");
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    {
      isActive: !event.isActive,
    },
    {
      new: true,
      runValidators: false,
    }
  ).populate("createdBy", "name");

  return {
    success: true,
    message: "Event status updated successfully.",
    data: updatedEvent,
  };
};