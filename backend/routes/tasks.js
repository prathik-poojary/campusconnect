const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");

const router = express.Router();

// GET /api/tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({
      createdBy: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Fetch tasks error:", error.message);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// POST /api/tasks
router.post("/", async (req, res) => {
  try {
    const { title, course, dueDate, priority } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    if (
      dueDate &&
      (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate)))
    ) {
      return res.status(400).json({
        message: "Invalid due date",
      });
    }

    const allowedPriorities = ["Low", "Medium", "High"];

    if (priority !== undefined && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Priority must be Low, Medium, or High",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      course:
        typeof course === "string" && course.trim() ? course.trim() : "General",
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || "Medium",
      createdBy: req.user.id,
    });

    res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error.message);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const updates = {};

    if (typeof req.body.completed === "boolean") {
      updates.completed = req.body.completed;
    }

    if (typeof req.body.title === "string" && req.body.title.trim()) {
      updates.title = req.body.title.trim();
    }

    if (typeof req.body.course === "string") {
      updates.course = req.body.course.trim() || "General";
    }

    if (req.body.dueDate !== undefined) {
      if (req.body.dueDate === null || req.body.dueDate === "") {
        updates.dueDate = null;
      } else if (!Number.isNaN(Date.parse(req.body.dueDate))) {
        updates.dueDate = new Date(req.body.dueDate);
      } else {
        return res.status(400).json({ message: "Invalid due date" });
      }
    }

    const allowedPriorities = ["Low", "Medium", "High"];
    if (req.body.priority !== undefined) {
      if (!allowedPriorities.includes(req.body.priority)) {
        return res.status(400).json({ message: "Priority must be Low, Medium, or High" });
      }
      updates.priority = req.body.priority;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one valid field to update",
      });
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: id,
        createdBy: req.user.id,
      },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found or you do not own this task",
      });
    }

    res.json(task);
  } catch (error) {
    console.error("Update task error:", error.message);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findOneAndDelete({
      _id: id,
      createdBy: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found or you do not own this task",
      });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error.message);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

module.exports = router;
