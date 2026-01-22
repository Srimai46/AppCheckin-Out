const prisma = require('../../config/prisma'); 
const { validateAndApplyQuotaCaps } = require("../../utils/leaveUtils");
// ✅ Import Helper มาแล้ว ต้องใช้ให้ครบทุกจุดครับ
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
          
          const typeKey = type.typeName.toUpperCase();
          const configValue = carryConfigs[typeKey];
          
          let allowedMaxCarry = 0;
          let allowedTotalCap = 999; 

          if (typeof configValue === 'number') {
            allowedMaxCarry = configValue;
          } else if (typeof configValue === 'string') {
             allowedMaxCarry = parseInt(configValue, 10) || 0;
          } else if (typeof configValue === 'object' && configValue !== null) {
            allowedMaxCarry = Number(configValue.maxCarry || 0);
            allowedTotalCap = Number(configValue.totalCap || 999);
          }

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
            const remaining =
              Number(oldQuota.totalDays) +
              Number(oldQuota.carryOverDays) -
              Number(oldQuota.usedDays);
            
            rawCarry = Math.max(remaining, 0);
          }

          const { finalBase, finalCarry } = validateAndApplyQuotaCaps({
            typeName: typeKey,
            totalDays: Number(quotas[typeKey] || 0),
            carryOverDays: rawCarry,
            hrMaxCarry: allowedMaxCarry,
            hrTotalCap: allowedTotalCap,
          });

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

      // 4. เปิดงวดปีใหม่
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

      // 5. บันทึก Audit Log (✅ แก้มาใช้ Helper)
      await auditLog(tx, {
        action: "SYSTEM_LOCK",
        modelName: "SystemConfig",
        recordId: tYear,
        userId: userId,
        details: auditDetails,
        newValue: {
            targetYear: tYear,
            baseQuotasSent: quotas,
            carryConfigsUsed: carryConfigs,
            maxConsecutiveDays: maxConsecutiveVal
        },
        req: req
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

    if (!year || maxConsecutiveDays === undefined) {
      return res.status(400).json({ message: "Missing required fields (year, maxConsecutiveDays)." });
    }

    const targetYear = parseInt(year, 10);
    const newMax = parseInt(maxConsecutiveDays, 10);

    if (isNaN(newMax) || newMax < 0) {
       return res.status(400).json({ message: "Max consecutive days must be a positive number or 0." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.systemConfig.findUnique({
        where: { year: targetYear },
      });

      if (!existing) {
        throw new Error(`Configuration for year ${targetYear} not found.`);
      }

      const updated = await tx.systemConfig.update({
        where: { year: targetYear },
        data: { maxConsecutiveDays: newMax },
      });

      const auditDetails = `HR updated System Config for ${targetYear}. Max Consecutive: ${existing.maxConsecutiveDays} -> ${newMax}`;
      
      // ✅ ตรงนี้ใช้ Helper ถูกแล้ว
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

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.systemConfig.findUnique({
        where: { year: targetYear },
      });

      if (!existing) {
        throw new Error(`Config for year ${targetYear} not found.`);
      }

      if (!existing.isClosed) {
        throw new Error(`Year ${targetYear} is already open.`);
      }

      const updated = await tx.systemConfig.update({
        where: { year: targetYear },
        data: {
          isClosed: false,
          closedAt: null,
        },
      });

      const auditDetails = `HR re-opened year ${targetYear}. Reason: ${reason}`;

      // 3. บันทึก Audit Log (✅ แก้มาใช้ Helper)
      await auditLog(tx, {
        action: "UPDATE", // หรือ "SYSTEM_UNLOCK"
        modelName: "SystemConfig",
        recordId: targetYear,
        userId: hrId,
        details: auditDetails,
        oldValue: { isClosed: true, closedAt: existing.closedAt },
        newValue: { isClosed: false, closedAt: null },
        req: req
      });

      return { updated, auditDetails };
    });

    const io = req.app.get("io");
    if (io) {
        io.emit("notification_refresh");

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
      message: `Year ${targetYear} has been re-opened for editing.`,
      data: result.updated,
    });
  } catch (error) {
    console.error("reopenYear Error:", error);
    res.status(400).json({ error: error.message || "Failed to re-open the fiscal year." });
  }
};