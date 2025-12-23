const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads/leaves");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `leave_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.mimetype);
  if (!ok) return cb(new Error("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) และ PDF"));
  cb(null, true);
};

const uploadLeaveAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { uploadLeaveAttachment };
