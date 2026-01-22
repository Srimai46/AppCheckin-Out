// backend/src/routes/roleRoutes.js
const express = require("express");
const router = express.Router();

const roleController = require("../controllers/roleController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// ทุกคนที่ login ดู role ได้ (หรือจะจำกัด HR ก็ได้)
router.get("/", protect, roleController.getAllRoles);

// จัดการ role (ถ้าคุณไม่อยากให้แก้ role ในระบบ ก็ลบ 3 route นี้ออกได้)
router.post("/", protect, authorize("ADMIN"), roleController.createRole);
router.put("/:id", protect, authorize("ADMIN"), roleController.updateRole);
router.delete("/:id", protect, authorize("ADMIN"), roleController.deleteRole);

module.exports = router;
