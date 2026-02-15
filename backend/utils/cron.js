const cron = require("node-cron");
const Upload = require("../models/Upload");
const cloudinary = require("./cloudinary"); // Import Cloudinary

const startCronJob = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    console.log("⏳ Cron Job: Checking for expired files...");

    try {
      const now = new Date();
      const expiredFiles = await Upload.find({ expiresAt: { $lt: now } });

      if (expiredFiles.length > 0) {
        console.log(`🗑️ Found ${expiredFiles.length} expired files. Deleting...`);

        for (const file of expiredFiles) {
          // 1. Delete from Cloudinary (if file)
          if (file.type === "file" && file.uniqueId) {
             try {
               // We delete using the public_id we set (linkvault/uniqueId)
               await cloudinary.uploader.destroy(`linkvault/${file.uniqueId}`);
               console.log(`Cloudinary deleted: ${file.uniqueId}`);
             } catch (e) {
               console.error("Cloudinary Delete Failed:", e);
             }
          }
          // 2. Delete from MongoDB
          await Upload.deleteOne({ _id: file._id });
        }
        console.log("✅ Cleanup complete.");
      }
    } catch (err) {
      console.error("❌ Cron Job Error:", err);
    }
  });
};

module.exports = startCronJob;