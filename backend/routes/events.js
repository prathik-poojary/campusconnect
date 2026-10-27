const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");

const router = express.Router();

// GET /api/events
// All logged-in students can view campus events.
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error("Fetch events error:", error.message);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

// POST /api/events
router.post("/", async (req, res) => {
  try {
    const { title, description, date, location, category } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      !date ||
      Number.isNaN(Date.parse(date)) ||
      typeof location !== "string" ||
      !location.trim()
    ) {
      return res.status(400).json({
        message: "Valid title, date and location are required",
      });
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length > 100) {
      return res.status(400).json({ message: "Title must be under 100 characters" });
    }

    const cleanLocation = location.trim();
    if (cleanLocation.length > 120) {
      return res.status(400).json({ message: "Location must be under 120 characters" });
    }

    const event = await Event.create({
      title: cleanTitle,
      description: typeof description === "string" ? description.trim() : "",
      date: new Date(date),
      location: cleanLocation,
      category:
        typeof category === "string" && category.trim()
          ? category.trim()
          : "General",
      createdBy: req.user.id,
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error("Create event error:", error.message);
    res.status(500).json({ message: "Failed to create event" });
  }
});

// PATCH /api/events/:id/join
// Atomically prevents the same user joining twice.
router.patch("/:id/join", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        attendeeUsers: { $ne: req.user.id },
      },
      {
        $addToSet: {
          attendeeUsers: req.user.id,
        },
        $inc: {
          attendees: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!event) {
      const existingEvent = await Event.findById(id);

      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.status(409).json({
        message: "You have already joined this event.",
      });
    }

    res.json({ event });
  } catch (error) {
    console.error("Join event error:", error.message);
    res.status(500).json({ message: "Failed to join event" });
  }
});

// PATCH /api/events/:id/leave
// Remove user from attendeeUsers and decrement attendees count.
router.patch("/:id/leave", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Only update if the user is currently in attendeeUsers
    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        attendeeUsers: req.user.id,
      },
      {
        $pull: { attendeeUsers: req.user.id },
        $inc: { attendees: -1 },
      },
      { new: true, runValidators: true },
    );

    if (!event) {
      const existingEvent = await Event.findById(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      return res.status(409).json({ message: "You haven't joined this event." });
    }

    // Ensure attendees never goes below 0
    if (event.attendees < 0) {
      await Event.findByIdAndUpdate(id, { $set: { attendees: 0 } });
      event.attendees = 0;
    }

    res.json({ event });
  } catch (error) {
    console.error("Leave event error:", error.message);
    res.status(500).json({ message: "Failed to leave event" });
  }
});

// PATCH /api/events/:id — edit title/description/date/location/category (creator only)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const { title, description, date, location, category } = req.body;
    const updates = {};

    if (typeof title === "string" && title.trim()) {
      updates.title = title.trim();
    }
    if (typeof description === "string") {
      updates.description = description.trim();
    }
    if (date && !Number.isNaN(Date.parse(date))) {
      updates.date = new Date(date);
    }
    if (typeof location === "string" && location.trim()) {
      updates.location = location.trim();
    }
    if (typeof category === "string" && category.trim()) {
      updates.category = category.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const event = await Event.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found or you do not own this event",
      });
    }

    res.json({ event });
  } catch (error) {
    console.error("Update event error:", error.message);
    res.status(500).json({ message: "Failed to update event" });
  }
});

// DELETE /api/events/:id
// Only the creator can delete their event.
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findOneAndDelete({
      _id: id,
      createdBy: req.user.id,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found or you do not own this event",
      });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error.message);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

module.exports = router;
