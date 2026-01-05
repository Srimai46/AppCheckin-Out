// backend/src/controllers/leaves/leaveTypeController.js

const prisma = require("../../config/prisma");
const { auditLog } = require("../../utils/logger");

// =====================================================
// ✅ Global Policy Key (ใช้ default ให้ LeaveType.maxConsecutiveDays)
// =====================================================
const MAX_CONSECUTIVE_KEY = "MAX_CONSECUTIVE_HOLIDAYS";
const DEFAULT_MAX_CONSECUTIVE = 0; // 0 = Unlimited

const toIntOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
};

const toFloatOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
};

const normalizeMaxConsecutiveDays = (v) => {
  const n = toIntOrNull(v);
  if (n === null) return null;
  // อนุญาต 0-365 (0 = Unlimited)
  if (n < 0 || n > 365) return null;
  return n;
};

const normalizeCarryOver = (v) => {
  const n = toFloatOrNull(v);
  if (n === null) return null;
  // ไม่ให้ติดลบ
  if (n < 0) return null;
  return n;
};

const normalizeIsPaid = (v) => {
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return undefined;
};

const formatConsecutive = (n) => (Number(n) === 0 ? "Unlimited" : `${Number(n)} days`);

const getGlobalMaxConsecutive = async (tx) => {
  // tx อาจเป็น prisma หรือ transaction client
  const row = await tx.holidayPolicy.findUnique({
    where: { key: MAX_CONSECUTIVE_KEY },
    select: { maxConsecutiveHolidayDays: true },
  });
  const val = Number(row?.maxConsecutiveHolidayDays ?? DEFAULT_MAX_CONSECUTIVE);
  return Number.isFinite(val) ? val : DEFAULT_MAX_CONSECUTIVE;
};

// =====================================================
// ✅ Get All Leave Types
// =====================================================
exports.getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { id: "asc" },
    });
    res.json(leaveTypes);
  } catch (error) {
    console.error("getAllLeaveTypes Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =====================================================
// ✅ Create Leave Type
// - ถ้าไม่ส่ง maxConsecutiveDays มา -> ใช้ global policy เป็น default
// =====================================================
exports.createLeaveType = async (req, res) => {
  try {
    const { typeName, isPaid, maxCarryOver, maxConsecutiveDays } = req.body;
    const adminId = req.user.id;

    if (!typeName) return res.status(400).json({ error: "Type name is required." });

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveType.findUnique({ where: { typeName } });
      if (existing) throw new Error(`Leave type "${typeName}" already exists.`);

      // ✅ normalize fields
      const paid = normalizeIsPaid(isPaid);
      const carry = normalizeCarryOver(maxCarryOver);
      const consecutive = normalizeMaxConsecutiveDays(maxConsecutiveDays);

      // ✅ default maxConsecutiveDays = global policy ถ้าไม่ได้ส่งมา
      const globalDefault = await getGlobalMaxConsecutive(tx);
      const finalConsecutive =
        consecutive === null ? globalDefault : consecutive; // ถ้าส่งมาไม่ถูกต้อง -> null -> ใช้ global

      if (maxConsecutiveDays !== undefined && consecutive === null) {
        // ผู้ใช้ส่งมาแต่ผิด format
        throw new Error("maxConsecutiveDays must be an integer between 0 and 365");
      }
      if (maxCarryOver !== undefined && carry === null) {
        throw new Error("maxCarryOver must be a number >= 0");
      }

      const newType = await tx.leaveType.create({
        data: {
          typeName: String(typeName).trim(),
          isPaid: paid !== undefined ? paid : true,
          maxCarryOver: carry !== null ? carry : 0,
          maxConsecutiveDays: finalConsecutive,
        },
      });

      const logDetails = `Created new leave type: ${newType.typeName}`;

      const cleanNewValue = {
        id: newType.id,
        name: newType.typeName,
        isPaid: newType.isPaid ? "Yes" : "No",
        maxConsecutive: formatConsecutive(newType.maxConsecutiveDays),
        maxCarryOver: Number(newType.maxCarryOver),
      };

      await auditLog(tx, {
        action: "CREATE",
        modelName: "LeaveType",
        recordId: newType.id,
        userId: adminId,
        details: logDetails,
        newValue: cleanNewValue,
        req: req,
      });

      return { newType, logDetails, cleanNewValue };
    });

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
          lastName: adminUser?.lastName || "",
        },
        details: result.logDetails,
        newValue: result.cleanNewValue,
        createdAt: new Date(),
      });
    }

    res.status(201).json({ message: "Leave type created.", data: result.newType });
  } catch (error) {
    console.error("createLeaveType Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// =====================================================
// ✅ Update Leave Type
// - validate maxConsecutiveDays 0-365
// =====================================================
exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxConsecutiveDays, maxCarryOver, isPaid } = req.body;

    const adminId = req.user.id;
    const typeId = parseInt(id, 10);
    if (!Number.isFinite(typeId)) return res.status(400).json({ error: "Invalid id" });

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const oldType = await tx.leaveType.findUnique({ where: { id: typeId } });
      if (!oldType) throw new Error("Leave type not found.");

      const dataToUpdate = {};

      // ✅ maxConsecutiveDays
      if (maxConsecutiveDays !== undefined) {
        const val = normalizeMaxConsecutiveDays(maxConsecutiveDays);
        if (val === null) throw new Error("maxConsecutiveDays must be an integer between 0 and 365");
        dataToUpdate.maxConsecutiveDays = val;
      }

      // ✅ maxCarryOver
      if (maxCarryOver !== undefined) {
        const val = normalizeCarryOver(maxCarryOver);
        if (val === null) throw new Error("maxCarryOver must be a number >= 0");
        dataToUpdate.maxCarryOver = val;
      }

      // ✅ isPaid
      if (isPaid !== undefined) {
        const paid = normalizeIsPaid(isPaid);
        if (paid === undefined) throw new Error('isPaid must be boolean ("true"/"false")');
        dataToUpdate.isPaid = paid;
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return { updatedType: oldType, logDetails: `Updated ${oldType.typeName} (No changes)`, changes: [] };
      }

      const updatedType = await tx.leaveType.update({
        where: { id: typeId },
        data: dataToUpdate,
      });

      const changes = [];

      if (
        dataToUpdate.maxConsecutiveDays !== undefined &&
        Number(dataToUpdate.maxConsecutiveDays) !== Number(oldType.maxConsecutiveDays)
      ) {
        changes.push(
          `Consecutive Limit: ${formatConsecutive(oldType.maxConsecutiveDays)} -> ${formatConsecutive(
            dataToUpdate.maxConsecutiveDays
          )}`
        );
      }

      if (
        dataToUpdate.maxCarryOver !== undefined &&
        Number(dataToUpdate.maxCarryOver) !== Number(oldType.maxCarryOver)
      ) {
        changes.push(`Max Carry Over: ${Number(oldType.maxCarryOver)} -> ${Number(dataToUpdate.maxCarryOver)}`);
      }

      if (dataToUpdate.isPaid !== undefined && dataToUpdate.isPaid !== oldType.isPaid) {
        changes.push(`Paid Status: ${oldType.isPaid ? "Paid" : "Unpaid"} -> ${dataToUpdate.isPaid ? "Paid" : "Unpaid"}`);
      }

      const logDetails =
        changes.length > 0
          ? `Updated policy for ${oldType.typeName}: ${changes.join(", ")}`
          : `Updated ${oldType.typeName} (No critical changes)`;

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "LeaveType",
        recordId: typeId,
        userId: adminId,
        details: logDetails,
        oldValue: oldType,
        newValue: updatedType,
        req: req,
      });

      return { updatedType, logDetails, changes };
    });

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
          lastName: adminUser?.lastName || "",
        },
        details: result.logDetails,
        newValue: { changes: result.changes },
        createdAt: new Date(),
      });
    }

    res.json({ message: "Leave type updated.", data: result.updatedType });
  } catch (error) {
    console.error("updateLeaveType Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// =====================================================
// ✅ Delete Leave Type (เดิม)
// =====================================================
exports.deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const typeId = parseInt(id, 10);

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const targetType = await tx.leaveType.findUnique({ where: { id: typeId } });
      if (!targetType) throw new Error("Leave type not found.");

      const usageCount = await tx.leaveRequest.count({ where: { leaveTypeId: typeId } });
      if (usageCount > 0) {
        throw new Error(
          `Cannot delete "${targetType.typeName}" because it has ${usageCount} related leave requests. Please disable/rename it instead.`
        );
      }

      await tx.leaveQuota.deleteMany({ where: { leaveTypeId: typeId } });
      await tx.specialLeaveGrant.deleteMany({ where: { leaveTypeId: typeId } });
      await tx.leaveType.delete({ where: { id: typeId } });

      const logDetails = `Deleted leave type: ${targetType.typeName}`;

      await auditLog(tx, {
        action: "DELETE",
        modelName: "LeaveType",
        recordId: typeId,
        userId: adminId,
        details: logDetails,
        oldValue: { name: targetType.typeName },
        req: req,
      });

      return { logDetails, typeName: targetType.typeName };
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "DELETE",
        modelName: "LeaveType",
        recordId: typeId,
        performedBy: {
          firstName: adminUser?.firstName || "Unknown",
          lastName: adminUser?.lastName || "",
        },
        details: result.logDetails,
        createdAt: new Date(),
      });
    }

    res.json({ message: `Leave type "${result.typeName}" deleted successfully.` });
  } catch (error) {
    console.error("deleteLeaveType Error:", error);
    res.status(400).json({ error: error.message });
  }
};
