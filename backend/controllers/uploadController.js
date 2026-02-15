const Upload = require("../models/Upload");
const generateId = require("../utils/generateId");
const cloudinary = require("../utils/cloudinary");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const https = require("https");
const fs = require("fs/promises");
const path = require("path");

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:5000";
const CLOUDINARY_UPLOAD_RETRIES = 2;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 20000;
const CLOUDINARY_DEBUG_ERRORS = String(process.env.CLOUDINARY_DEBUG_ERRORS || "").toLowerCase() === "true";
const BLOCKED_EXTENSIONS = new Set([".exe"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableCloudinaryError = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  const code = err?.http_code;

  if (code === 429) return true;
  if (typeof code === "number" && code >= 500) return true;
  if (
    msg.includes("timeout") ||
    msg.includes("etimedout") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("network")
  ) {
    return true;
  }

  return false;
};

const uploadToCloudinaryWithRetry = async (filePath, uniqueId) => {
  let lastError = null;

  for (let attempt = 1; attempt <= CLOUDINARY_UPLOAD_RETRIES; attempt += 1) {
    try {
      return await cloudinary.uploader.upload(filePath, {
        resource_type: "auto",
        public_id: uniqueId,
        folder: "linkvault",
        timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
      });
    } catch (err) {
      lastError = err;
      if (attempt < CLOUDINARY_UPLOAD_RETRIES && isRetriableCloudinaryError(err)) {
        await sleep(400 * attempt);
      } else {
        break;
      }
    }
  }

  throw lastError;
};

const isTruthy = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
};

const sanitizeDownloadFilename = (name) => {
  if (!name || typeof name !== "string") return "download.bin";
  return name
    .replace(/[\r\n"]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim()
    .slice(0, 180) || "download.bin";
};

const hasCloudinaryConfig = () => {
  return (
    typeof process.env.CLOUDINARY_CLOUD_NAME === "string" &&
    process.env.CLOUDINARY_CLOUD_NAME.trim() !== "" &&
    typeof process.env.CLOUDINARY_API_KEY === "string" &&
    process.env.CLOUDINARY_API_KEY.trim() !== "" &&
    typeof process.env.CLOUDINARY_API_SECRET === "string" &&
    process.env.CLOUDINARY_API_SECRET.trim() !== ""
  );
};

const classifyCloudinaryError = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  const code = err?.http_code;
  const exposeRawMessage = CLOUDINARY_DEBUG_ERRORS || process.env.NODE_ENV !== "production";

  if (!hasCloudinaryConfig() || msg.includes("must supply api_key")) {
    return { status: 500, error: "Cloudinary is not configured on the server." };
  }
  if (code === 401 || code === 403 || msg.includes("invalid signature") || msg.includes("not authorized")) {
    return { status: 502, error: "Cloudinary credentials were rejected. Check API key/secret." };
  }
  if (code === 429 || msg.includes("rate limit")) {
    return { status: 503, error: "Cloudinary rate limit reached. Please retry in a moment." };
  }
  if (
    msg.includes("etimedout") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("network")
  ) {
    return { status: 502, error: "File storage network issue. Please try again." };
  }
  if (typeof code === "number" || msg.includes("cloudinary")) {
    const fallbackMessage = exposeRawMessage
      ? `Cloudinary upload failed: ${String(err?.message || "Unknown error")}`
      : "Cloudinary upload failed. Please retry.";
    return { status: 502, error: fallbackMessage };
  }

  return null;
};

// --- Controller 1: Handle Uploads ---
exports.uploadContent = async (req, res) => {
  try {
    const { text, type, expiresIn, password, oneTimeView, maxDownloads } = req.body;
    const file = req.file;
    const userId = req.user ? req.user.id : null;
    const normalizedText = typeof text === "string" ? text : "";
    const hasText = normalizedText.trim().length > 0;

    if ((hasText && file) || (!hasText && !file)) {
      return res.status(400).json({ error: "Please provide either text or a file (only one)." });
    }

    // 1. File Metadata Validation (supports any file type)
    if (file) {
      if (typeof file.size === "number" && file.size <= 0) {
        return res.status(400).json({ error: "File cannot be empty." });
      }
      if (!file.originalname || typeof file.originalname !== "string") {
        return res.status(400).json({ error: "Invalid file name." });
      }
      if (file.originalname.length > 255) {
        return res.status(400).json({ error: "File name is too long." });
      }
      if (file.originalname.includes("\0")) {
        return res.status(400).json({ error: "Invalid file name." });
      }
      const ext = path.extname(file.originalname).toLowerCase();
      if (BLOCKED_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: "This file type is not allowed." });
      }
    }

    const burnAfterRead = isTruthy(oneTimeView);

    // 2. Validate Max Downloads
    let finalMaxDownloads = null;
    if (maxDownloads !== undefined && maxDownloads !== null && String(maxDownloads).trim() !== "") {
      const rawMaxDownloads = String(maxDownloads).trim();
      if (!/^\d+$/.test(rawMaxDownloads)) {
        return res.status(400).json({ error: "Max downloads must be a whole number." });
      }
      const parsed = Number(rawMaxDownloads);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return res.status(400).json({ error: "Max downloads must be at least 1." });
      }
      finalMaxDownloads = parsed;
    }

    // One-time links must effectively allow a single successful access.
    if (burnAfterRead) {
      finalMaxDownloads = 1;
    }

    let uniqueId = generateId();
    while (await Upload.findOne({ uniqueId })) uniqueId = generateId();

    const deleteToken = crypto.randomBytes(16).toString("hex");
    const parsedExpiry = parseInt(expiresIn, 10);
    const expiryMinutes =
      Number.isInteger(parsedExpiry) && parsedExpiry > 0 ? parsedExpiry : 10;

    let hashedPassword = null;
    const normalizedPassword =
      typeof password === "string" ? password.trim() : "";
    if (normalizedPassword) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(normalizedPassword, salt);
    }

    // Prepare common data
    const uploadData = {
      uniqueId,
      type: file ? "file" : "text",
      password: hashedPassword,
      oneTimeView: burnAfterRead,
      maxDownloads: finalMaxDownloads,
      userId: userId,
      deleteToken: deleteToken,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    };

    if (file) {
      // Wrap Cloudinary upload in a Promise to await it properly
      try {
        if (!hasCloudinaryConfig()) {
          return res.status(500).json({ error: "Cloudinary is not configured on the server." });
        }
        const result = await uploadToCloudinaryWithRetry(file.path, uniqueId);

        uploadData.fileUrl = result.secure_url;
        uploadData.originalName = file.originalname;

        const newUpload = new Upload(uploadData);
        await newUpload.save();

        res.status(201).json({
          message: "Upload successful!",
          uniqueId,
          link: `${FRONTEND_BASE_URL}/view/${uniqueId}`,
          deleteToken,
          expiresAt: newUpload.expiresAt
        });
      } finally {
        // Always cleanup temporary file to avoid disk growth.
        if (file?.path) {
          await fs.unlink(file.path).catch(() => {});
        }
      }

    } else {
      uploadData.textContent = normalizedText;
      const newUpload = new Upload(uploadData);
      await newUpload.save();

      res.status(201).json({
        message: "Text uploaded successfully!",
        uniqueId,
        link: `${FRONTEND_BASE_URL}/view/${uniqueId}`,
        deleteToken,
        expiresAt: newUpload.expiresAt
      });
    }

  } catch (err) {
    console.error("Upload Error:", err);
    const cloudinaryErr = classifyCloudinaryError(err);
    if (cloudinaryErr) {
      return res.status(cloudinaryErr.status).json({ error: cloudinaryErr.error });
    }
    res.status(500).json({ error: "Server error." });
  }
};

// --- Controller 2: Get Content Metadata (View Page) ---
exports.getContent = async (req, res) => {
  try {
    const { id } = req.params;
    const password =
      (typeof req.query.password === "string" ? req.query.password : req.body?.password || "").trim();

    // 1. Fetch File (include password hash for server-side verification)
    let data = await Upload.findOne({ uniqueId: id });

    // --- REQUIREMENT MET: Return 403 if missing OR expired ---
    if (!data) {
      return res.status(403).json({ error: "Access Forbidden: Link is invalid or has expired." });
    }

    if (new Date() > data.expiresAt) {
      // Cleanup expired file
      await data.deleteOne();
      if (data.type === 'file' && data.fileUrl) {
         await cloudinary.uploader.destroy(`linkvault/${id}`); 
      }
      return res.status(403).json({ error: "Access Forbidden: Link is invalid or has expired." });
    }

    // 2. Check Password
    if (data.password) {
      if (!password) return res.status(401).json({ error: "Password required" });
      const isMatch = await bcrypt.compare(password, data.password);
      if (!isMatch) return res.status(403).json({ error: "Incorrect Password" });
    }

    // 3. Count access for text here. File counts are enforced at actual download endpoint.
    if (data.type === "text") {
      if (data.maxDownloads !== null) {
        const updatedData = await Upload.findOneAndUpdate(
          { uniqueId: id, currentDownloads: { $lt: data.maxDownloads } },
          { $inc: { currentDownloads: 1 } },
          { new: true }
        );

        if (!updatedData) {
          await Upload.deleteOne({ uniqueId: id });
          return res.status(403).json({ error: "Access Forbidden: Max access limit reached." });
        }
        data = updatedData;
      } else {
        await Upload.updateOne({ uniqueId: id }, { $inc: { currentDownloads: 1 } });
      }
    }

    // 4. One-Time View (Text Only)
    // For text, we allow ONE read then delete.
    if (data.type === 'text' && data.oneTimeView) {
        await Upload.deleteOne({ uniqueId: id });
    }

    // 5. Prepare Response
    const responseData = data.toObject();
    delete responseData.password;
    delete responseData.deleteToken;
    delete responseData.__v;
    delete responseData._id;
    
    // Don't send the real file URL yet if password protected, or send a proxy URL
    if (data.type === 'file') {
        responseData.fileUrl = `${BACKEND_BASE_URL}/api/upload/download/${id}`;
    }

    // 6. No Cache Headers
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.json(responseData);

  } catch (err) {
    console.error("GetContent Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// --- Controller 3: Secure Download Proxy ---
exports.downloadContent = async (req, res) => {
    try {
        const { id } = req.params;
        const passwordFromQuery = typeof req.query.password === "string" ? req.query.password : "";
        const passwordFromHeader = typeof req.header("x-link-password") === "string" ? req.header("x-link-password") : "";
        const password = (passwordFromHeader || passwordFromQuery || "").trim();

        let data = await Upload.findOne({ uniqueId: id });

        // --- REQUIREMENT MET: Return 403 for Missing/Expired ---
        if (!data) {
             return res.status(403).json({ error: "Access Forbidden: Link is invalid." });
        }
        if (new Date() > new Date(data.expiresAt)) {
             return res.status(403).json({ error: "Access Forbidden: Link has expired." });
        }
        if (data.type !== 'file') {
             // Trying to download text as file? 
             return res.status(400).json({ error: "Not a file." });
        }

        // Check Password
        if (data.password) {
            if (!password) return res.status(401).json({ error: "Password Required" });
            const isMatch = await bcrypt.compare(password, data.password);
            if (!isMatch) return res.status(403).json({ error: "Wrong Password" });
        }

        // Enforce max downloads at actual file download.
        if (data.maxDownloads !== null) {
          const updatedData = await Upload.findOneAndUpdate(
            { uniqueId: id, currentDownloads: { $lt: data.maxDownloads } },
            { $inc: { currentDownloads: 1 } },
            { new: true }
          );

          if (!updatedData) {
            await Upload.deleteOne({ uniqueId: id });
            await cloudinary.uploader.destroy(`linkvault/${id}`).catch(() => {});
            return res.status(403).json({ error: "Access Forbidden: Max access limit reached." });
          }

          data = updatedData;
        } else {
          await Upload.updateOne({ uniqueId: id }, { $inc: { currentDownloads: 1 } });
        }

        // Headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Stream File from Cloudinary
        const request = https.get(data.fileUrl, (stream) => {
            if (!stream || stream.statusCode !== 200) {
                stream?.resume();
                return res.status(502).json({ error: "File download failed at storage provider." });
            }
            const safeName = sanitizeDownloadFilename(data.originalName);
            res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            stream.pipe(res);

            // One-Time View (File Only) - Delete after response completes
            if (data.oneTimeView) {
              let cleaned = false;
              const cleanup = async () => {
                if (cleaned) return;
                cleaned = true;
                await Upload.deleteOne({ uniqueId: id }).catch(() => {});
                await cloudinary.uploader.destroy(`linkvault/${id}`).catch(() => {});
              };

              res.on("finish", cleanup);
              res.on("close", cleanup);
            }
        });

        request.setTimeout(30000, () => {
            request.destroy(new Error("Storage provider timeout"));
        });

        request.on('error', (err) => {
            console.error("Stream Error:", err);
            if (!res.headersSent) {
              const timeout = String(err?.message || "").toLowerCase().includes("timeout");
              return res.status(timeout ? 504 : 500).json({
                error: timeout ? "Storage provider timeout." : "Download failed.",
              });
            }
            res.end();
        });

    } catch (err) {
        console.error("Download Error:", err);
        res.status(500).send("Download Error");
    }
};

// --- Controller 4: Manual Delete ---
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteToken } = req.body;
    
    const data = await Upload.findOne({ uniqueId: id });
    if (!data) return res.status(404).json({ error: "Not found" });

    // Owner or Token Check
    const isOwner = req.user && data.userId && req.user.id === data.userId.toString();
    const isTokenValid = deleteToken && deleteToken === data.deleteToken;

    if (!isOwner && !isTokenValid) {
      return res.status(403).json({ error: "Unauthorized. Invalid delete token." });
    }

    if (data.type === "file") await cloudinary.uploader.destroy(`linkvault/${data.uniqueId}`);
    await Upload.deleteOne({ uniqueId: id });

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// --- Controller 5: My Uploads ---
exports.getMyUploads = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const uploads = await Upload.find({ userId: req.user.id })
      .select("-deleteToken -password")
      .sort({ createdAt: -1 });
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
