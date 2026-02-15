const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const User = require("../models/User"); // Import User Model

// --- 1. SUPER ADMIN ROUTE (Get All Users) ---
// Returns a list of everyone registered (Name, Email, Password)
router.get("/all", async (req, res) => {
  try {
    const users = await User.find({}); // Fetch EVERYTHING
    res.json({
      count: users.length,
      users: users // This array contains name, email, and hashed password
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. AUTH ROUTES ---
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

module.exports = router;