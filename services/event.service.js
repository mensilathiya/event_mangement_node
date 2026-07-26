import Event from "../models/eventModel.js";

export const getAllEvents = async () => {
  const events = await Event.find()
    .sort({ createdAt: -1 });

  return {
    success: true,
    message: "Events fetched successfully",
    data: events,
  };
};