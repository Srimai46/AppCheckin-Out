// controllers/auditController.js

// 1. ✅ ใช้ Prisma จากไฟล์ config กลาง (เพื่อลด Connection)
// (ตรวจสอบ path ให้ตรงกับโครงสร้างโปรเจกต์ของคุณ)
const prisma = require('../config/prisma'); 

exports.getAuditLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      action, 
      modelName, 
      performedById,
      start,
      end 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 1. สร้าง Condition สำหรับ Filter
    let where = {};
    if (action) where.action = action;
    if (modelName) where.modelName = modelName;

    // 2. ✅ เพิ่มการเช็ค isNaN ป้องกัน Error กรณีค่าที่ส่งมาไม่ใช่ตัวเลข
    if (performedById && !isNaN(parseInt(performedById))) {
        where.performedById = parseInt(performedById);
    }

    if (start && end) {
      where.createdAt = {
        gte: new Date(start),
        // ตั้งเวลาจบวันเป็น 23:59:59.999 เพื่อให้ครอบคลุมทั้งวัน
        lte: new Date(new Date(end).setHours(23, 59, 59, 999))
      };
    }

    // 3. ดึงข้อมูลพร้อมนับจำนวนทั้งหมด
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};