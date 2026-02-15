const cloudinary = require("cloudinary").v2;

// 1. Configure with your Dashboard Credentials
cloudinary.config({
  cloud_name: "djvhhfhoy", 
  api_key: "822928473537873", 
  api_secret: "xqEbfrGKETtG6VAVyKfxC7Bnnjc" 
});

module.exports = cloudinary;