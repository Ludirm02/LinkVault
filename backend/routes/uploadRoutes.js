const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadController = require("../controllers/uploadController");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const auth = require("../middleware/authMiddleware");           // Strict Auth (Keep for MyList)
const optionalAuth = require("../middleware/optionalAuthMiddleware"); // Optional Auth

// 1. Upload Route: Use 'optionalAuth' so Guests work too!
router.post("/", optionalAuth, (req, res, next) => {
    const upload = uploadMiddleware.single("file");
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                  error: `File too large! Maximum size is ${uploadMiddleware.maxFileSizeMb || 100}MB.`,
                });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: "An unknown error occurred during upload." });
        }
        next();
    });
}, uploadController.uploadContent);

// 2. Get My Uploads: Keep 'auth' (Must be logged in)
router.get("/my/list", auth, uploadController.getMyUploads);

// 3. Download: Keep Public (No middleware needed for basic download)
router.get("/download/:id", uploadController.downloadContent);

// 4. Get Metadata: Keep Public
router.get("/:id", uploadController.getContent);

// 5. Manual Delete: Allow guest delete via token, or owner delete via auth token
router.post("/delete/:id", optionalAuth, uploadController.deleteContent);

module.exports = router;
