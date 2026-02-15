const multer = require("multer");
const fs = require("fs");
const path = require("path");

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);
const tmpUploadDir = path.join(__dirname, "..", "uploads", "tmp");
fs.mkdirSync(tmpUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpUploadDir),
  filename: (_req, file, cb) => {
    const safeName = (file.originalname || "upload.bin")
      .replace(/[^\w.\-]/g, "_")
      .slice(0, 120);
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

upload.maxFileSizeMb = MAX_FILE_SIZE_MB;
module.exports = upload;
