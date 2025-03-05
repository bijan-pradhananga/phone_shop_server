const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './public/products';
    
    // Check if the directory exists, and create it if not
    fs.exists(uploadPath, (exists) => {
      if (!exists) {
        fs.mkdir(uploadPath, { recursive: true }, (err) => {
          if (err) {
            return cb(err, null);
          }
          cb(null, uploadPath);
        });
      } else {
        cb(null, uploadPath); // Directory exists
      }
    });
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter to allow only image uploads
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png) are allowed!'));
  }
};

// Multer instance
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
  fileFilter
});

module.exports = upload;
