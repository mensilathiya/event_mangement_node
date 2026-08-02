const express = require("express");
const router = express.Router();

const ticketTypeController = require("../controllers/ticketType.controller");
const {
    createTicketTypeValidation,
    updateTicketTypeValidation,
    validate,
} = require("../validators/ticketType.validator");
const { protect } = require("../middlewares/auth.middleware");

router.post(
    "/create",
    createTicketTypeValidation,
    validate,
    protect,
    ticketTypeController.createTicketType
);
// get event 
router.get("/get-all-ticket-types/:eventId", protect, ticketTypeController.getAllTicketTypes);

// update api
router.put(
    "/update/:id",
    updateTicketTypeValidation,
    protect,
    validate,
    ticketTypeController.updateTicketType
);
// delete
router.delete(
    "/delete/:id",
    protect,
    ticketTypeController.deleteTicketType
);
module.exports = router;