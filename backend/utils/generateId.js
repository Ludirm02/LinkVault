const crypto = require("crypto");

// Generates a high-entropy 32-character hex string (16 bytes)
const generateId = () => {
  return crypto.randomBytes(16).toString("hex");
};

module.exports = generateId;
