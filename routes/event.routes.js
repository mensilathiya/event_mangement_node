const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const eventController = require("../controllers/event.controller");
// create
router.post(
  "/create",
  upload.single("image"),
  eventController.createEvent
);
// get event by id
router.get("/:id", eventController.getEventById);
// get all event
router.get("/get-all-events", eventController.getAllEvents);
module.exports = router;