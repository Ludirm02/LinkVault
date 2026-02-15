const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true },
  type: { type: String, enum: ["file", "text"], required: true },
  textContent: { type: String },
  fileUrl: { type: String },
  originalName: { type: String },
  password: { type: String },        // Feature: Password
  oneTimeView: { type: Boolean, default: false }, // Feature: One-Time View
  
  // --- UPDATED SECTION: Strict Validation ---
  maxDownloads: { 
    type: Number, 
    default: null,
    min: [1, "Max downloads must be at least 1"] // <--- Prevents 0 or Negative
  },
  currentDownloads: { 
    type: Number, 
    default: 0,
    min: [0, "Current downloads cannot be negative"] 
  },
  // ------------------------------------------

  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Feature: Auth
  deleteToken: { type: String, required: true }, // Feature: Manual Delete

  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model("Upload", uploadSchema);