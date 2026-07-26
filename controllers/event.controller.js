const Event = require("../models/event.model");
// post api 
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      venueName,
      latitude,
      longitude,
      address,
      termsConditions,
      videoLinks,
    } = req.body;

    const event = await Event.create({
      title,
      description,
      startDateTime,
      endDateTime,
      venueName,
      latitude,
      longitude,
      address,
      termsConditions,
      videoLinks: videoLinks
        ? JSON.parse(videoLinks)
        : [],
      image: req.file ? req.file.path : "",
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully.",
      data: event,
    });
  } catch (error) {
    next(error);
  }
};
// get api
exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event fetched successfully",
      data: event,
    });
  } catch (error) {
    next(error);
  }
};
// get all events
export const getAllEvents = async (req, res) => {
  try {
    const result = await eventService.getAllEvents(req.query);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
