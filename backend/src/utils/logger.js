// utils/logger.js
exports.auditLog = async (tx, { 
  action, 
  modelName, 
  recordId, 
  userId, 
  details, 
  oldValue = null, 
  newValue = null, 
  req 
}) => {
  try {
    // 1. บันทึกข้อมูล (เพิ่ม include เพื่อให้ได้ชื่อคนไปโชว์หน้าจอทันที)
    const log = await tx.auditLog.create({
      data: {
        action,
        modelName,
        recordId,
        performedById: userId,
        details,
        oldValue: oldValue ? JSON.stringify(oldValue) : null, // แปลง JSON ก่อนเก็บ
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null,
      },
      // เพิ่มตรงนี้: เพื่อให้ Frontend รู้ว่าใครทำรายการ (เช่น "by Somsri")
      include: {
        performedBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    // 2. ส่ง Socket Signal (ถ้ามี req และ setup io ไว้แล้ว)
    if (req && req.app && req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('new-audit-log', log); // ส่ง event ชื่อ 'new-audit-log'
      console.log(`📡 Socket Emitted: ${action} on ${modelName}`);
    }

    return log;
  } catch (err) {
    console.error("Audit Log Error:", err);
    // ไม่ throw error เพื่อให้ process หลักทำงานต่อได้แม้ Log พัง
  }
};