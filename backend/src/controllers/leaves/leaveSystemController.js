// backend/src/controllers/leaves/leaveSystemController.js

const prisma = require('../../config/prisma'); 
const { validateAndApplyQuotaCaps } = require("../../utils/leaveUtils");
const { auditLog } = require("../../utils/logger");


exports.processCarryOver = async (req, res) => {
  try {
    const { targetYear, quotas = {}, carryConfigs = {}, maxConsecutiveDays } = req.body;
    
    const tYear = parseInt(targetYear, 10);
    const lastYear = tYear - 1;
    const userId = req.user.id;

    if (!tYear || isNaN(tYear)) throw new Error("Invalid targetYear.");

    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบสถานะปีเก่า
      const configOld = await tx.systemConfig.findUnique({
        where: { year: lastYear },
      });
      if (configOld?.isClosed)
        throw new Error(`Year ${lastYear} is already closed.`);

      // 2. ดึงข้อมูลพนักงานและประเภทวันลา
      const allEmployees = await tx.employee.findMany({
        where: { isActive: true },
      });
      const leaveTypes = await tx.leaveType.findMany();

      let processedCount = 0;

      // วนลูปประมวลผลให้พนักงานทุกคน
      for (const emp of allEmployees) {
        for (const type of leaveTypes) {
          
          // 🔥 แก้ไข 1: จัดการ Key ให้เป็น UpperCase เสมอ เพื่อป้องกันปัญหา Case Sensitive
          const typeKey = type.typeName.toUpperCase(); // เช่น "SICK", "ANNUAL"

          // 🔥 แก้ไข 2: รองรับค่าจาก Frontend ทั้งแบบตัวเลข และแบบ Object
          const configValue = carryConfigs[typeKey];
          
          let allowedMaxCarry = 0;
          let allowedTotalCap = 999; // ค่า Default ถ้าไม่กำหนด

          if (typeof configValue === 'number') {
            // กรณี Frontend ส่งมาเป็น: { "SICK": 5 }
            allowedMaxCarry = configValue;
          } else if (typeof configValue === 'string') {
             // กรณีส่งมาเป็น String: { "SICK": "5" }
             allowedMaxCarry = parseInt(configValue, 10) || 0;
          } else if (typeof configValue === 'object' && configValue !== null) {
            // กรณี Frontend ส่งมาเป็น Object: { "SICK": { maxCarry: 5 } }
            allowedMaxCarry = Number(configValue.maxCarry || 0);
            allowedTotalCap = Number(configValue.totalCap || 999);
          }

          // -------------------------------------------------------------

          const oldQuota = await tx.leaveQuota.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: lastYear,
              },
            },
          });

          let rawCarry = 0;
          if (oldQuota) {
            // คำนวณยอดคงเหลือจากปีที่แล้ว (Total + Carry - Used)
            const remaining =
              Number(oldQuota.totalDays) +
              Number(oldQuota.carryOverDays) -
              Number(oldQuota.usedDays);
            
            // ต้องไม่ต่ำกว่า 0
            rawCarry = Math.max(remaining, 0);
          }

          // ตรวจสอบเงื่อนไขเพดานการทบ (Caps)
          // ใช้งาน allowedMaxCarry ที่เราแกะค่ามาได้อย่างถูกต้อง
          const { finalBase, finalCarry } = validateAndApplyQuotaCaps({
            typeName: typeKey,
            totalDays: Number(quotas[typeKey] || 0),
            carryOverDays: rawCarry,
            hrMaxCarry: allowedMaxCarry, // ✅ ใช้ค่าที่รับมาจาก Frontend
            hrTotalCap: allowedTotalCap,
          });

          // บันทึก Quota ปีใหม่
          await tx.leaveQuota.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: tYear,
              },
            },
            update: { totalDays: finalBase, carryOverDays: finalCarry },
            create: {
              employeeId: emp.id,
              leaveTypeId: type.id,
              year: tYear,
              totalDays: finalBase,
              carryOverDays: finalCarry,
              usedDays: 0,
            },
          });
        }
        processedCount++;
      }

      // 3. ปิดงวดปีเก่า
      await tx.systemConfig.upsert({
        where: { year: lastYear },
        update: { isClosed: true, closedAt: new Date(), processedBy: userId },
        create: {
          year: lastYear,
          isClosed: true,
          closedAt: new Date(),
          processedBy: userId,
        },
      });

      // 4. เปิดงวดปีใหม่ และบันทึกค่า Max Consecutive Days
      const maxConsecutiveVal = maxConsecutiveDays ? parseInt(maxConsecutiveDays, 10) : 0;

      await tx.systemConfig.upsert({
        where: { year: tYear },
        update: { 
            isClosed: false,
            maxConsecutiveDays: maxConsecutiveVal 
        },
        create: { 
            year: tYear, 
            isClosed: false,
            maxConsecutiveDays: maxConsecutiveVal 
        },
      });

      const auditDetails = `Processed carry over from ${lastYear} to ${tYear}. Total employees: ${allEmployees.length}`;

      // 5. บันทึก Audit Log
      await tx.auditLog.create({
        data: {
          action: "SYSTEM_LOCK",
          modelName: "SystemConfig",
          recordId: tYear,
          performedById: userId,
          details: auditDetails,
          newValue: {
            targetYear: tYear,
            baseQuotasSent: quotas,
            carryConfigsUsed: carryConfigs, // บันทึกสิ่งที่ Frontend ส่งมา
            maxConsecutiveDays: maxConsecutiveVal
          },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      // 6. สร้าง Notification แจ้งพนักงาน
      const notifyData = allEmployees.map((emp) => ({
        employeeId: emp.id,
        notificationType: "Approval",
        message: `Your leave quotas for ${tYear} have been processed.`,
      }));
      await tx.notification.createMany({ data: notifyData });

      return { processedCount, auditDetails };
    });

    // 7. Real-time Socket
    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "SystemConfig",
        recordId: tYear,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails,
        createdAt: new Date(),
      });
    }

    res.json({ message: "Success", employeesProcessed: result.processedCount });
  } catch (error) {
    console.error("processCarryOver Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ดึงสถานะการปิดงวดทั้งหมด
exports.getSystemConfigs = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const configs = await prisma.systemConfig.findMany({
      orderBy: { year: "desc" },
    });

    // ถ้ายังไม่มี Config ของปีปัจจุบัน ให้ถือว่าเปิดงวดไว้ก่อน
    const hasCurrentYear = configs.some((c) => c.year === currentYear);

    res.json({
      configs,
      serverYear: currentYear,
      isCurrentYearConfigured: hasCurrentYear,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปเดตการตั้งค่าระบบ (System Config)
exports.updateSystemConfig = async (req, res) => {
  try {
    const { year, maxConsecutiveDays } = req.body;
    const hrId = req.user.id;

    // Validation: เช็คว่าส่งค่ามาครบไหม (ระวัง! ถ้าส่ง 0 มา !0 จะเป็น true ดังนั้นต้องเช็ค undefined)
    if (!year || maxConsecutiveDays === undefined) {
      return res.status(400).json({ message: "Missing required fields (year, maxConsecutiveDays)." });
    }

    const targetYear = parseInt(year, 10);
    const newMax = parseInt(maxConsecutiveDays, 10);

    if (isNaN(newMax) || newMax < 0) {
       return res.status(400).json({ message: "Max consecutive days must be a positive number or 0." });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. หาข้อมูลเก่าก่อน (เพื่อเอามาทำ Audit Log)
      const existing = await tx.systemConfig.findUnique({
        where: { year: targetYear },
      });

      if (!existing) {
        throw new Error(`Configuration for year ${targetYear} not found.`);
      }

      // 2. อัปเดตข้อมูล
      const updated = await tx.systemConfig.update({
        where: { year: targetYear },
        data: { maxConsecutiveDays: newMax },
      });

      // 3. บันทึก Audit Log
      const auditDetails = `HR updated System Config for ${targetYear}. Max Consecutive: ${existing.maxConsecutiveDays} -> ${newMax}`;
      
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "SystemConfig",
        recordId: targetYear,
        userId: hrId,
        details: auditDetails,
        oldValue: { maxConsecutiveDays: existing.maxConsecutiveDays },
        newValue: { maxConsecutiveDays: newMax },
        req: req
      });

      return { updated, auditDetails };
    });

    // 4. Socket (Optional: ถ้าอยากให้หน้าจอ Setting เครื่องอื่นอัปเดตทันที)
    const io = req.app.get("io");
    if (io) {
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "UPDATE",
            modelName: "SystemConfig",
            recordId: targetYear,
            performedBy: {
                firstName: req.user.firstName,
                lastName: req.user.lastName
            },
            details: result.auditDetails,
            createdAt: new Date()
        });
    }

    res.json({ 
        message: "System config updated successfully", 
        data: result.updated 
    });

  } catch (err) {
    console.error("updateSystemConfig Error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// ยกเลิกการปิดงวด (Re-open Year)
exports.reopenYear = async (req, res) => {
  try {
    const { year, reason } = req.body; 
    const targetYear = parseInt(year, 10);
    const hrId = req.user.id;

    if (!targetYear) {
      return res.status(400).json({ error: "Please specify a valid year." });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
          error: "Please provide a valid reason for re-opening the year.",
        });
    }

    // เริ่ม Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. เช็คว่ามีข้อมูลปีนี้อยู่จริงไหม
      const existing = await tx.systemConfig.findUnique({
        where: { year: targetYear },
      });

      if (!existing) {
        throw new Error(`Config for year ${targetYear} not found.`);
      }

      if (!existing.isClosed) {
        throw new Error(`Year ${targetYear} is already open.`);
      }

      // 2. อัปเดตสถานะ
      const updated = await tx.systemConfig.update({
        where: { year: targetYear },
        data: {
          isClosed: false,
          closedAt: null,
        },
      });

      const auditDetails = `HR re-opened year ${targetYear}. Reason: ${reason}`;

      // 3. บันทึก Audit Log ลง Database
      await tx.auditLog.create({
        data: {
          action: "UPDATE", // หรือ "SYSTEM_UNLOCK"
          modelName: "SystemConfig",
          recordId: targetYear,
          performedById: hrId,
          details: auditDetails,
          oldValue: { isClosed: true, closedAt: existing.closedAt },
          newValue: { isClosed: false, closedAt: null },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      return { updated, auditDetails };
    });

    // 4. ส่วน Real-time (Socket.io)
    const io = req.app.get("io");
    if (io) {
        // 4.1 สั่งให้หน้าจอ Dashboard/Settings ของเครื่องอื่นรีเฟรชสถานะ
        io.emit("notification_refresh");

        // 4.2 ส่ง Audit Log ไปแสดงบนหน้าจอ System Activities
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "UPDATE", // ใช้สีส้ม เพื่อเตือนว่ามีการแก้ไขปีงบประมาณ
            modelName: "SystemConfig",
            recordId: targetYear,
            performedBy: {
                firstName: req.user.firstName,
                lastName: req.user.lastName
            },
            details: result.auditDetails, // "HR re-opened year... Reason: ..."
            createdAt: new Date()
        });
    }

    res.json({
      message: `Year ${targetYear} has been re-opened for editing.`,
      data: result.updated,
    });
  } catch (error) {
    console.error("reopenYear Error:", error);
    res.status(400).json({ error: error.message || "Failed to re-open the fiscal year." });
  }
};