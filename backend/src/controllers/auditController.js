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

    // 1. สร้าง Condition พื้นฐาน
    let where = {};
    if (action) where.action = action;
    if (modelName) where.modelName = modelName;

    if (performedById && !isNaN(parseInt(performedById))) {
        where.performedById = parseInt(performedById);
    }

    if (start && end) {
      where.createdAt = {
        gte: new Date(start),
        lte: new Date(new Date(end).setHours(23, 59, 59, 999))
      };
    }

    // =========================================================
    // ✅ UPDATE 1: Logic จำกัดสิทธิ์ (HR เห็นเฉพาะ Worker)
    // =========================================================
    const requesterRole = req.user.role; // (middleware แปลงเป็น String "HR"/"ADMIN" ให้แล้ว)

    if (requesterRole === 'HR') {
        // บังคับว่า Logs ที่ดึงมา ต้องเกิดจากคนที่เป็น WORKER เท่านั้น
        where.performedBy = {
            role: {
                name: 'WORKER'
            }
        };
    }
    // ถ้าเป็น ADMIN ไม่ต้องทำอะไร (where ว่าง = ดูได้หมด)

    // 3. ดึงข้อมูล
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
              // ✅ UPDATE 2: ดึงชื่อ Role จาก Relation Table
              role: { 
                  select: { name: true } 
              }
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    // ✅ UPDATE 3: แปลง Role Object ให้เป็น String เพื่อให้ Frontend ใช้ง่าย
    const formattedLogs = logs.map(log => ({
        ...log,
        performedBy: log.performedBy ? {
            ...log.performedBy,
            role: log.performedBy.role?.name || "Unknown"
        } : null
    }));

    res.json({
      success: true,
      data: formattedLogs,
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