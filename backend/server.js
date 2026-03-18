const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const startCronJob = require("./utils/cron"); // <--- Import Cron

// Import Routes
const uploadRoutes = require("./routes/uploadRoutes");
const userRoutes = require("./routes/userRoutes"); // <--- Import User Routes

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Use Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", userRoutes); // <--- Use User Routes

// Database Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI || MONGO_URI.trim() === "" || MONGO_URI === "your_mongodb_connection_string") {
  console.error("❌ Missing/invalid MONGO_URI in backend/.env");
  process.exit(1);
}
app.get("/", (req, res) => {
  res.json({ message: "LinkVault Backend Running 🚀" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected Successfully");
    startCronJob(); // START THE BACKGROUND JOB

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    server.on("error", (err) => {
      if (err?.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Set a different PORT in backend/.env.`);
      } else {
        console.error("❌ Server startup error:", err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

startServer();
