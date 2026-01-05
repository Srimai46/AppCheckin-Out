// backend/src/controllers/leaves/leaveTypeController.js

const prisma = require("../../utils/prisma");
const { auditLog } = require("../../utils/logger");

// ดึงรายการประเภทวันลา (Leave Types)
exports.getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { id: 'asc' } // เรียงตาม ID
    });
    res.json(leaveTypes);
  } catch (error) {
    console.error("getAllLeaveTypes Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// สร้างประเภทวันลาใหม่
exports.createLeaveType = async (req, res) => {
  try {
    const { typeName, isPaid, maxCarryOver, maxConsecutiveDays } = req.body;
    const adminId = req.user.id;

    // Validation ง่ายๆ
    if (!typeName) return res.status(400).json({ error: "Type name is required." });

    // หาข้อมูล Admin
    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true }
    });

    const result = await prisma.$transaction(async (tx) => {
      // เช็คชื่อซ้ำ
      const existing = await tx.leaveType.findUnique({ where: { typeName } });
      if (existing) throw new Error(`Leave type "${typeName}" already exists.`);

      // สร้างข้อมูล
      const newType = await tx.leaveType.create({
        data: {
          typeName,
          isPaid: isPaid ?? true, // Default เป็นจ่ายเงิน
          maxCarryOver: maxCarryOver ? parseFloat(maxCarryOver) : 0,
          maxConsecutiveDays: maxConsecutiveDays ? parseInt(maxConsecutiveDays) : 0,
        },
      });

      const logDetails = `Created new leave type: ${typeName}`;

      // จัด Format Log
      const cleanNewValue = {
          id: newType.id,
          name: newType.typeName,
          isPaid: newType.isPaid ? "Yes" : "No",
          maxConsecutive: newType.maxConsecutiveDays || "Unlimited",
          maxCarryOver: newType.maxCarryOver
      };

      // บันทึก Audit Log
      await auditLog(tx, {
        action: "CREATE",
        modelName: "LeaveType",
        recordId: newType.id,
        userId: adminId,
        details: logDetails,
        newValue: cleanNewValue,
        req: req
      });

      return { newType, logDetails, cleanNewValue };
    });

    // Socket
    const io = req.app.get("io");
    if (io) {
        io.emit("notification_refresh");
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "CREATE",
            modelName: "LeaveType",
            recordId: result.newType.id,
            performedBy: {
                firstName: adminUser?.firstName || "Unknown",
                lastName: adminUser?.lastName || ""
            },
            details: result.logDetails,
            newValue: result.cleanNewValue,
            createdAt: new Date()
        });
    }

    res.status(201).json({ message: "Leave type created.", data: result.newType });

  } catch (error) {
    console.error("createLeaveType Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// อัปเดตประเภทวันลา
exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxConsecutiveDays, maxCarryOver, isPaid } = req.body;
    const adminId = req.user.id;
    const typeId = parseInt(id);

    // 1. หาข้อมูล Admin
    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true }
    });

    const result = await prisma.$transaction(async (tx) => {
      // 2. ดึงข้อมูลเก่า
      const oldType = await tx.leaveType.findUnique({
        where: { id: typeId }
      });

      if (!oldType) throw new Error("Leave type not found.");

      // 3. เตรียมข้อมูลที่จะอัปเดต (✅ เพิ่ม Validation กันค่า NaN)
      const dataToUpdate = {};
      
      if (maxConsecutiveDays !== undefined) {
        const val = parseInt(maxConsecutiveDays);
        if (!isNaN(val)) dataToUpdate.maxConsecutiveDays = val;
      }

      if (maxCarryOver !== undefined) {
        const val = parseFloat(maxCarryOver);
        if (!isNaN(val)) dataToUpdate.maxCarryOver = val;
      }

      if (isPaid !== undefined) {
        // แปลงเป็น Boolean ให้ชัวร์ (เผื่อส่งมาเป็น string "true"/"false")
        dataToUpdate.isPaid = String(isPaid) === "true" || isPaid === true;
      }

      // 4. อัปเดตลง Database
      const updatedType = await tx.leaveType.update({
        where: { id: typeId },
        data: dataToUpdate,
      });

      // 5. สร้าง Log
      const changes = [];
      
      // เทียบ Max Consecutive
      if (dataToUpdate.maxConsecutiveDays !== undefined && dataToUpdate.maxConsecutiveDays !== oldType.maxConsecutiveDays) {
         const oldVal = oldType.maxConsecutiveDays === 0 ? "Unlimited" : `${oldType.maxConsecutiveDays} days`;
         const newVal = dataToUpdate.maxConsecutiveDays === 0 ? "Unlimited" : `${dataToUpdate.maxConsecutiveDays} days`;
         changes.push(`Consecutive Limit: ${oldVal} -> ${newVal}`);
      }
      
      // เทียบ Carry Over (ระวังเรื่อง Prisma Decimal)
      if (dataToUpdate.maxCarryOver !== undefined && Number(dataToUpdate.maxCarryOver) !== Number(oldType.maxCarryOver)) {
         changes.push(`Max Carry Over: ${Number(oldType.maxCarryOver)} -> ${Number(dataToUpdate.maxCarryOver)}`);
      }

      // เทียบ isPaid (แถมให้)
      if (dataToUpdate.isPaid !== undefined && dataToUpdate.isPaid !== oldType.isPaid) {
         changes.push(`Paid Status: ${oldType.isPaid ? 'Paid' : 'Unpaid'} -> ${dataToUpdate.isPaid ? 'Paid' : 'Unpaid'}`);
      }

      const logDetails = `Updated policy for ${oldType.typeName}: ${changes.join(", ")}`;

      // 6. Audit Log (อย่าลืม import auditLog helper มาด้วยนะครับ)
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "LeaveType",
        recordId: typeId,
        userId: adminId,
        details: changes.length > 0 ? logDetails : `Updated ${oldType.typeName} (No critical changes)`,
        newValue: {
            typeName: updatedType.typeName,
            policyChanges: changes,
            updatedConfig: dataToUpdate
        },
        req: req
      });

      return { updatedType, logDetails, changes };
    });

    // 7. Socket
    const io = req.app.get("io");
    if (io) {
        io.emit("notification_refresh");
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "UPDATE",
            modelName: "LeaveType",
            recordId: typeId,
            performedBy: {
                firstName: adminUser?.firstName || "Unknown",
                lastName: adminUser?.lastName || ""
            },
            details: result.logDetails,
            newValue: { changes: result.changes },
            createdAt: new Date()
        });
    }

    res.json({ message: "Leave type updated.", data: result.updatedType });

  } catch (error) {
    console.error("updateLeaveType Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ลบประเภทวันลา
exports.deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const typeId = parseInt(id);

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true }
    });

    const result = await prisma.$transaction(async (tx) => {
      // เช็คว่ามีอยู่จริงไหม
      const targetType = await tx.leaveType.findUnique({ where: { id: typeId } });
      if (!targetType) throw new Error("Leave type not found.");

      // 🛑 Guard: เช็คว่ามีการใช้งานไปแล้วหรือยัง (ใน LeaveRequest)
      // ถ้ามีคนเคยลาประเภทนี้แล้ว ห้ามลบ! (เพื่อรักษาประวัติ)
      const usageCount = await tx.leaveRequest.count({ where: { leaveTypeId: typeId } });
      if (usageCount > 0) {
        throw new Error(`Cannot delete "${targetType.typeName}" because it has ${usageCount} related leave requests. Please disable/rename it instead.`);
      }

      // ลบ Quota ของพนักงานทุกคนที่ผูกกับ Type นี้ก่อน (ไม่งั้นจะติด FK)
      await tx.leaveQuota.deleteMany({ where: { leaveTypeId: typeId } });
      
      // ลบ Special Grant ที่เกี่ยวข้อง (ถ้ามี)
      await tx.specialLeaveGrant.deleteMany({ where: { leaveTypeId: typeId } });

      // ลบตัว Type จริงๆ
      await tx.leaveType.delete({ where: { id: typeId } });

      const logDetails = `Deleted leave type: ${targetType.typeName}`;

      // บันทึก Audit Log
      await auditLog(tx, {
        action: "DELETE", // จะโชว์สีแดง
        modelName: "LeaveType",
        recordId: typeId,
        userId: adminId,
        details: logDetails,
        oldValue: { name: targetType.typeName }, // เก็บชื่อไว้ดูต่างหน้า
        req: req
      });

      return { logDetails, typeName: targetType.typeName };
    });

    // Socket
    const io = req.app.get("io");
    if (io) {
        io.emit("notification_refresh");
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "DELETE", // สีแดง
            modelName: "LeaveType",
            recordId: typeId,
            performedBy: {
                firstName: adminUser?.firstName || "Unknown",
                lastName: adminUser?.lastName || ""
            },
            details: result.logDetails,
            createdAt: new Date()
        });
    }

    res.json({ message: `Leave type "${result.typeName}" deleted successfully.` });

  } catch (error) {
    console.error("deleteLeaveType Error:", error);
    res.status(400).json({ error: error.message });
  }
};