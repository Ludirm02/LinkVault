const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports = function (req, res, next) {
  // 1. Get token from header
  const token = req.header("x-auth-token");

  // 2. If NO token, proceed as Guest (Anonymous)
  if (!token) {
    req.user = null;
    return next();
  }

  // 3. If token EXISTS, try to verify it
  try {
    const secret = process.env.JWT_SECRET || "secret";
    const decoded = jwt.verify(token, secret);
    req.user = decoded.user; // Save User ID
    next();
  } catch (err) {
    // 4. If token is INVALID (e.g. expired), tell frontend to logout
    console.error("Optional Auth Error:", err.message);
    return res.status(401).json({ error: "Session expired. Please logout and login again." });
  }
};
