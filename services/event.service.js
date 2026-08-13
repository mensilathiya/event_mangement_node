const mongoose = require("mongoose");
const Event = require("../models/event.model");
const TicketType = require("../models/ticketType.model");
const Booking = require("../models/booking.model");
const BookingTicket = require("../models/bookingTicket.model");
const uploadToCloudinary = require("../utils/cloudinary.util");
const generateEventCode = require("../utils/generateEventCode");

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

  // Assigned once, atomically, and never changed afterward — see
  // eventCode's comment in event.model.js.
  const eventCode = await generateEventCode();

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
    eventCode,
    // Written explicitly (not left to the schema default alone) so every
    // new event is guaranteed to have this field stored in MongoDB from
    // the moment it's created, regardless of the schema default.
    isDeleted: false,
  });

  return event;
};

// ================= GET OR CREATE EVENT CODE (LEGACY BACKFILL) =================
// Only relevant for events created before the eventCode field existed.
// Every event created via createEvent() above already has one. Called
// from bookingService.createBooking right before generating that
// booking's number, so a legacy event's code is assigned lazily, exactly
// once, the first time someone books it after this change is deployed.
//
// Concurrency-safe: if two bookings for the same legacy event are being
// created at the same moment, both may generate a candidate code, but
// only one findOneAndUpdate can match `eventCode: { $exists: false }` and
// actually persist it — the loser simply re-reads whichever code won and
// uses that instead, so the event can never end up stamped with two
// different codes. `eventDoc` is a Mongoose document from within the
// caller's transaction; passing the same `session` keeps this update
// inside that same transaction.
exports.getOrCreateEventCode = async (eventDoc, session) => {
  if (eventDoc.eventCode) {
    return eventDoc.eventCode;
  }

  const candidateCode = await generateEventCode(session);

  const updated = await Event.findOneAndUpdate(
    { _id: eventDoc._id, eventCode: { $exists: false } },
    { $set: { eventCode: candidateCode } },
    { new: true, session }
  );

  if (updated) {
    eventDoc.eventCode = updated.eventCode;
    return updated.eventCode;
  }

  // Someone else won the race between our read and this update — use
  // the code they set instead of the one we generated (which is simply
  // left unused, same as any other rolled-back counter increment).
  const existing = await Event.findById(eventDoc._id)
    .select("eventCode")
    .session(session);

  eventDoc.eventCode = existing.eventCode;
  return existing.eventCode;
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

// ================= DELETE EXPIRED EVENTS (AUTOMATIC CLEANUP) =================
// Invoked on a recurring schedule by schedulers/eventExpiry.scheduler.js —
// never by an Admin action. An event is "expired" purely by
// endDateTime < now, the same check already used elsewhere (e.g.
// bookingService.createBooking's expiry guard, dashboardService's
// getActiveEvent) — isActive is not part of the expiry test.
//
// For every expired event, all data that explicitly references it via
// eventId is permanently removed — BookingTicket, Booking, and TicketType
// (TicketType.eventId is a required ref to Event, the same relationship
// Booking/BookingTicket already have) — and then the Event document
// itself is deleted (not soft-deleted).
//
// Each event is cleaned up inside its own transaction, in its own
// try/catch, so:
//   - a failure on one event is logged and skipped, never thrown, so it
//     can't stop the remaining expired events from being processed.
//   - every delete is scoped by that event's own eventId, so another
//     event's Booking/BookingTicket/TicketType documents are never
//     touched.
//   - booking/ticket numbers come from the shared Counter documents
//     (`BOOKING_${year}` / `TICKET_${year}` in counters.model.js), which
//     are keyed by year, not by eventId. This function never reads or
//     writes the Counter collection, so no other event's numbering
//     sequence is ever affected by an expired event's deletion.
exports.deleteExpiredEvents = async () => {
  const now = new Date();

  // Only truly expired events. isDeleted is intentionally not filtered
  // on: a soft-deleted event whose endDateTime has also passed still has
  // Booking/BookingTicket/TicketType data that needs to be purged.
  const expiredEvents = await Event.find({
    endDateTime: { $lt: now },
  })
    .select("_id title endDateTime")
    .lean();

  const summary = {
    processed: 0,
    failed: 0,
    details: [],
  };

  for (const expiredEvent of expiredEvents) {
    const eventId = expiredEvent._id;
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const ticketResult = await BookingTicket.deleteMany(
        { eventId },
        { session }
      );

      const bookingResult = await Booking.deleteMany(
        { eventId },
        { session }
      );

      const ticketTypeResult = await TicketType.deleteMany(
        { eventId },
        { session }
      );

      await Event.deleteOne({ _id: eventId }, { session });

      await session.commitTransaction();

      summary.processed += 1;
      summary.details.push({
        eventId,
        title: expiredEvent.title,
        bookingsDeleted: bookingResult.deletedCount,
        bookingTicketsDeleted: ticketResult.deletedCount,
        ticketTypesDeleted: ticketTypeResult.deletedCount,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      summary.failed += 1;
      summary.details.push({
        eventId,
        title: expiredEvent.title,
        error: error.message,
      });

      console.error(
        `[deleteExpiredEvents] cleanup failed for event ${eventId}:`,
        error
      );
      // Not re-thrown — this event's failure must not prevent the loop
      // below from continuing to the next expired event.
    } finally {
      await session.endSession();
    }
  }

  return summary;
};