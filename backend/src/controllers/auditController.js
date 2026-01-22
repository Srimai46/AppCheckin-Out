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
        // ใช้ Relation ในการกรอง (ปลอดภัยกว่า)
        where.performedBy = { id: parseInt(performedById) };
    }

    if (start && end) {
      where.createdAt = {
        gte: new Date(start),
        lte: new Date(new Date(end).setHours(23, 59, 59, 999))
      };
    }

    // 2. ดึง Role
    let requesterRole = "Unknown";
    if (req.user?.role) {
        if (typeof req.user.role === 'string') {
            requesterRole = req.user.role;
        } else if (typeof req.user.role === 'object' && req.user.role.name) {
            requesterRole = req.user.role.name;
        }
    }

    // 3. ปรับ Logic การมองเห็นของ HR
    if (requesterRole === 'HR') {
        where.OR = [
            // 1. ดูของ Worker
            { performedBy: { role: { name: 'WORKER' } } }, 
            
            // 2. ดูของตัวเอง
            { performedBy: { id: req.user.id } }
            
            // ❌ เอา { performedBy: null } ออก เพราะ Schema บังคับว่าต้องมี User
        ];
    }
    // ADMIN เห็นทุกอย่าง

    // 4. ดึงข้อมูล
    try {
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
                            role: { 
                                select: { name: true } 
                            }
                        }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        // 5. จัดรูปแบบข้อมูล
        const formattedLogs = logs.map(log => {
            const roleName = log.performedBy?.role?.name || "Unknown";
            return {
                ...log,
                performedBy: log.performedBy ? {
                    firstName: log.performedBy.firstName,
                    lastName: log.performedBy.lastName,
                    role: roleName
                } : null // ถ้าไม่มี user (ซึ่งไม่ควรเกิดตาม schema) ก็ส่ง null
            };
        });

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

    } catch (dbError) {
        console.error("❌ Prisma Error:", dbError);
        return res.status(500).json({ success: false, error: "Database Error" });
    }

  } catch (error) {
    console.error("❌ Controller Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};