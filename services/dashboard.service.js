import Event from "../models/event.model.js";
import Booking from "../models/booking.model.js";
import BookingTicket from "../models/bookingTicket.model.js";
import TicketType from "../models/ticketType.model.js";

// Get Active Event
const getActiveEvent = async () => {
    return await Event.findOne({
        isActive: true,
        isDeleted: false, // જો field હોય તો
    })
        .sort({ startDateTime: 1 })
        .select("_id title startDateTime endDateTime")
        .lean();
};


// Today Booking
const getTodayBooking = async (eventId) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return await Booking.countDocuments({
        eventId,
        createdAt: {
            $gte: start,
            $lte: end,
        },
    });
};


// Today Pass Entry
const getTodayPassBooking = async (eventId) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return await BookingTicket.countDocuments({
        eventId,
        status: "Used",
        scannedAt: {
            $gte: start,
            $lte: end,
        },
    });
};


// Total Booking
const getTotalBooking = async (eventId) => {
    return await Booking.countDocuments({
        eventId,
    });
};


// Total Pass Entry
const getTotalPassBooking = async (eventId) => {
    return await BookingTicket.countDocuments({
        eventId,
        status: "Used",
    });
};


// Booking Chart Count
const getBookingCounts = async (eventId) => {

    const data = await Booking.aggregate([
        {
            $match: {
                eventId,
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt",
                    },
                },
                count: {
                    $sum: 1,
                },
            },
        },
        {
            $sort: {
                _id: 1,
            },
        },
    ]);

    return data.map((item) => ({
        date: item._id,
        count: item.count,
    }));
};

// Total Booking Details (Day Wise)
const getTotalBookingDetails = async (eventId) => {
    const bookings = await Booking.find({
        eventId,
        isDeleted: false,
    })
        .select("quantity ticketTypeId")
        .populate({
            path: "ticketTypeId",
            select: "allowDates",
        })
        .lean();

    const dateWiseMap = {};

    bookings.forEach((booking) => {
        if (!booking.ticketTypeId?.allowDates?.length) return;

        booking.ticketTypeId.allowDates.forEach((date) => {
            const key = new Date(date).toISOString().split("T")[0];

            if (!dateWiseMap[key]) {
                dateWiseMap[key] = {
                    date: key,
                    count: 0,
                };
            }

            dateWiseMap[key].count += booking.quantity;
        });
    });

    return Object.values(dateWiseMap).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );
};
// Dashboard Summary
export const getDashboardSummary = async () => {

    const activeEvent = await getActiveEvent();

    if (!activeEvent) {
        return {
            activeEvent: null,
            todayBooking: 0,
            todayPassBooking: 0,
            totalBooking: 0,
            totalPassBooking: 0,
            bookingCounts: [],
            totalBookingDetails: [],
        };
    }


    const todayBooking = await getTodayBooking(activeEvent._id);
    const todayPassBooking = await getTodayPassBooking(activeEvent._id);
    const totalBooking = await getTotalBooking(activeEvent._id);
    const totalPassBooking = await getTotalPassBooking(activeEvent._id);
    const bookingCounts = await getBookingCounts(activeEvent._id);
    const totalBookingDetails = await getTotalBookingDetails(
        activeEvent._id
    );

    return {
        activeEvent,
        todayBooking,
        todayPassBooking,
        totalBooking,
        totalPassBooking,
        bookingCounts,
        totalBookingDetails,
    };
};