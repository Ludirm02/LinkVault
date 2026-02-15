const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
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
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    startCronJob(); // <--- START THE BACKGROUND JOB
  })
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.get("/", (req, res) => {
  res.json({ message: "LinkVault Backend Running 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
