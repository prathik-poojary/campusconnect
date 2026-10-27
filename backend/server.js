const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

require("dotenv").config();

const eventRoutes = require("./routes/events");
const taskRoutes = require("./routes/tasks");
const authRoutes = require("./routes/auth");
const requireAuth = require("./middleware/auth");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",")
      : "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "CampusConnect API is running!" });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", requireAuth, eventRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);

const PORT = process.env.PORT || 8085;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from backend/.env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
