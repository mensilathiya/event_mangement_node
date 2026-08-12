const mongoose = require("mongoose");
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
    // Written explicitly (not left to the schema default alone) so every
    // new event is guaranteed to have this field stored in MongoDB from
    // the moment it's created, regardless of the schema default.
    isDeleted: false,
  });

  return event;
};

// Get Event By Id
exports.getEventById = async (id) => {
  const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } })
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

  const filter = { isDeleted: { $ne: true } };

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

// Update Event
exports.updateEvent = async (id, data, file) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Event ID");
  }

  const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } });

  if (!event) {
    throw new Error("Event not found");
  }

  let imageUrl = event.image;
  let imagePublicId = event.imagePublicId;

  if (file) {
    const uploadedImage = await uploadToCloudinary(
      file.buffer,
      "event-management/events"
    );

    imageUrl = uploadedImage.url;
    imagePublicId = uploadedImage.public_id;
  }

  // isActive is intentionally left untouched here — it is only ever
  // changed through changeEventStatus. This guarantees that editing an
  // event that is already expired/inactive can never flip it back to
  // Active as a side effect of the update.
  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    {
      title: data.title,
      description: data.description,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      venueName: data.venueName,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      termsConditions: data.termsConditions,
      videoLinks: data.videoLinks
        ? JSON.parse(data.videoLinks)
        : event.videoLinks,
      image: imageUrl,
      imagePublicId: imagePublicId,
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate("createdBy", "name");

  return updatedEvent;
};

// Delete Event
exports.deleteEvent = async (id, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Event ID");
  }

  const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } });

  if (!event) {
    throw new Error("Event not found");
  }

  // Soft-delete only — the event is hidden from getAllEvents/getEventById/
  // changeEventStatus from this point on, but the document itself, and
  // every Booking / BookingTicket / attendee record that references this
  // eventId, is left completely untouched. No cascading, no dependency
  // block: existing bookings/reports keep working exactly as before,
  // they're just now tied to a soft-deleted event.
  await Event.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: adminId || null,
  });

  return {
    success: true,
    message: "Event deleted successfully.",
  };
};

// Change Event Status
exports.changeEventStatus = async (id) => {
  const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } });

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