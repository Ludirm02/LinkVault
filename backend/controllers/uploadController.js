const Upload = require("../models/Upload");
const generateId = require("../utils/generateId");
const cloudinary = require("../utils/cloudinary");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const https = require("https");
const fs = require("fs/promises");

const isTruthy = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
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
      if (!file.originalname || typeof file.originalname !== "string") {
        return res.status(400).json({ error: "Invalid file name." });
      }
      if (file.originalname.length > 255) {
        return res.status(400).json({ error: "File name is too long." });
      }
      if (file.originalname.includes("\0")) {
        return res.status(400).json({ error: "Invalid file name." });
      }
    }

    const burnAfterRead = isTruthy(oneTimeView);

    // 2. Validate Max Downloads
    let finalMaxDownloads = null;
    if (maxDownloads) {
      const parsed = parseInt(maxDownloads);
      if (isNaN(parsed) || parsed < 1) {
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
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
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
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: "auto",
          public_id: uniqueId,
          folder: "linkvault",
        });

        uploadData.fileUrl = result.secure_url;
        uploadData.originalName = file.originalname;

        const newUpload = new Upload(uploadData);
        await newUpload.save();

        res.status(201).json({
          message: "Upload successful!",
          uniqueId,
          link: `http://localhost:5173/view/${uniqueId}`,
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
        link: `http://localhost:5173/view/${uniqueId}`,
        deleteToken,
        expiresAt: newUpload.expiresAt
      });
    }

  } catch (err) {
    console.error("Upload Error:", err);
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

    // 3. ATOMIC COUNTER & Max Views Check
    if (data.maxDownloads !== null) {
        // Try to increment ONLY if current < max
        const updatedData = await Upload.findOneAndUpdate(
            { uniqueId: id, currentDownloads: { $lt: data.maxDownloads } },
            { $inc: { currentDownloads: 1 } },
            { new: true }
        );

        if (!updatedData) {
            // Limit reached: Delete and Return 403
            await Upload.deleteOne({ uniqueId: id });
            if (data.type === 'file') await cloudinary.uploader.destroy(`linkvault/${id}`);
            return res.status(403).json({ error: "Access Forbidden: Max views reached." });
        }
        data = updatedData;
    } else {
        // Just increment stats
        await Upload.updateOne({ uniqueId: id }, { $inc: { currentDownloads: 1 } });
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
        responseData.fileUrl = `http://localhost:5000/api/upload/download/${id}`;
        // If they just unlocked it with a password, append it to the download link
        if (password) responseData.fileUrl += `?password=${encodeURIComponent(password)}`;
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
        const password = (typeof req.query.password === "string" ? req.query.password : "").trim();

        const data = await Upload.findOne({ uniqueId: id });

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

        // NOTE: We do NOT increment count here. 
        // It was incremented in 'getContent' (Metadata View).

        // Headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Stream File from Cloudinary
        https.get(data.fileUrl, (stream) => {
            res.setHeader('Content-Disposition', `attachment; filename="${data.originalName}"`);
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
        }).on('error', (err) => {
            console.error("Stream Error:", err);
            res.status(500).end();
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
