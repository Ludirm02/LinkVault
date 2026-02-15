const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// Helper: Escape regex special characters
const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

// 1. Register User
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Normalize inputs
    const cleanUsername = username?.trim();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user exists (Case Insensitive)
    const existingUser = await User.findOne({ 
        $or: [
            { email: { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') } },
            { username: { $regex: new RegExp(`^${escapeRegex(cleanUsername)}$`, 'i') } }
        ]
    });

    if (existingUser) {
      return res.status(400).json({ error: "User or Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// 2. Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    // Check user (Case Insensitive)
    const user = await User.findOne({ 
        email: { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') } 
    });
    
    if (!user) return res.status(400).json({ error: "Invalid Credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid Credentials" });

    // Return Token AND Username
    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.json({ 
            token, 
            username: user.username 
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};