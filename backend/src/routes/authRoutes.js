const express = require("express");
const router = express.Router();

// 1. เพิ่ม getAllEmployees เข้าไปในปีกกา
const { login, getMe, getAllEmployees } = require("../controllers/authController");

// 2. เพิ่ม authorize เข้าไปในปีกกา
const { protect, authorize } = require("../middlewares/authMiddleware");

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me (ต้องแนบ Token มาด้วย)
router.get("/me", protect, getMe);

// GET /api/auth/employees (เฉพาะ HR)
router.get("/employees", protect, authorize("HR"), getAllEmployees);

module.exports = router;