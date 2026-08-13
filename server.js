require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const cloudinary = require("./config/cloudinary");
const { startEventExpiryScheduler } = require("./schedulers/eventExpiry.scheduler");

console.log("Cloudinary Configured");
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Automatic expired-event cleanup (deletes expired Event/Booking/
  // BookingTicket/TicketType docs on a recurring interval — see
  // schedulers/eventExpiry.scheduler.js). Started only after connectDB()
  // resolves so the first cleanup tick never runs against a disconnected
  // DB.
  startEventExpiryScheduler();

  app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
    );
  });
};

startServer();