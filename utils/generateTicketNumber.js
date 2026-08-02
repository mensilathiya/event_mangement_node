const Counter = require("../models/counters.model");

const generateTicketNumber = async (session) => {
  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    {
      name: `TICKET_${year}`,
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      upsert: true,
      session,
      setDefaultsOnInsert: true,
    }
  );

  return `TKT${year}${String(counter.sequence).padStart(6, "0")}`;
};

module.exports = generateTicketNumber;