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
    // 1. บันทึกข้อมูล
    const log = await tx.auditLog.create({
      data: {
        action,
        modelName,
        recordId,
        performedById: userId,
        details,
        // ❌ ลบ JSON.stringify ออกครับ ใส่ตัวแปรไปตรงๆ เลย
        oldValue: oldValue, 
        newValue: newValue,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null,
      },
      // include เพื่อให้ได้ชื่อคน (เผื่อกรณีดึงจาก DB ตรงๆ)
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

    // ❌ comment หรือลบส่วนนี้ออกครับ 
    // เพราะเราไปสั่ง emit ใน Controller (createEmployee, updateEmployee) แล้ว
    // ถ้าไม่ลบ มันจะเด้ง 2 รอบ (รอบนึงสวย รอบนึงดิบ)
    /* if (req && req.app && req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('new-audit-log', log); 
      console.log(`📡 Socket Emitted from Utils: ${action}`);
    } 
    */

    return log;
  } catch (err) {
    console.error("Audit Log Error:", err);
    // ไม่ throw error เพื่อให้ process หลักทำงานต่อได้แม้ Log พัง
  }
};