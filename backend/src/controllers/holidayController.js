// backend/src/controllers/holidayController.js
const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger");

const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
};

// =====================================================
// ✅ Working Days Policy
// key = "WORKING_DAYS", workingDays = JSON ["MON","TUE",...]
// =====================================================

const WORKING_DAYS_KEY = "WORKING_DAYS";
const VALID_DAYS = new Set(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
const DEFAULT_WORKING_DAYS = ["MON", "TUE", "WED", "THU", "FRI"];

const normalizeWorkingDays = (input) => {
  const arr = Array.isArray(input) ? input : [];
  const cleaned = arr
    .map((x) => String(x || "").trim().toUpperCase())
    .filter((x) => VALID_DAYS.has(x));
  return [...new Set(cleaned)];
};

// ✅ GET /api/holidays/working-days
exports.getWorkingDaysPolicy = async (req, res) => {
  try {
    const row = await prisma.holidayPolicy.findUnique({
      where: { key: WORKING_DAYS_KEY },
      select: { key: true, workingDays: true, updatedAt: true, updatedBy: true },
    });

    const workingDays = Array.isArray(row?.workingDays)
      ? row.workingDays
      : DEFAULT_WORKING_DAYS;

    res.json({
      key: WORKING_DAYS_KEY,
      workingDays,
      updatedAt: row?.updatedAt || null,
      updatedBy: row?.updatedBy || null,
    });
  } catch (error) {
    console.error("getWorkingDaysPolicy Error:", error);
    res.status(500).json({ error: "Failed to fetch working days policy" });
  }
};

// ✅ PUT /api/holidays/working-days (HR)
exports.saveWorkingDaysPolicy = async (req, res) => {
  try {
    const hrId = req.user.id;
    const incoming = normalizeWorkingDays(req.body?.workingDays);

    if (incoming.length === 0) {
      return res
        .status(400)
        .json({ error: "workingDays must have at least 1 valid day" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldRow = await tx.holidayPolicy.findUnique({
        where: { key: WORKING_DAYS_KEY },
      });

      const saved = await tx.holidayPolicy.upsert({
        where: { key: WORKING_DAYS_KEY },
        create: {
          key: WORKING_DAYS_KEY,
          workingDays: incoming,
          updatedBy: hrId,
        },
        update: {
          workingDays: incoming,
          updatedBy: hrId,
        },
      });

      const auditDetails = `HR updated Working Days policy: [${(
        oldRow?.workingDays || DEFAULT_WORKING_DAYS
      ).join(", ")}] -> [${incoming.join(", ")}]`;

      await auditLog(tx, {
        action: oldRow ? "UPDATE" : "CREATE",
        modelName: "HolidayPolicy",
        recordId: oldRow?.id || saved?.id || 0,
        userId: hrId,
        details: auditDetails,
        oldValue: oldRow || null,
        newValue: saved,
        req: req,
      });

      return { saved, auditDetails, action: oldRow ? "UPDATE" : "CREATE" };
    });

    // Real-time Notification (Socket.io)
    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: result.action,
        modelName: "HolidayPolicy",
        recordId: 0,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails,
        createdAt: new Date(),
      });
    }

    res.json({
      message: "Working days policy saved successfully",
      data: result.saved,
    });
  } catch (error) {
    console.error("saveWorkingDaysPolicy Error:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to save working days policy" });
  }
};

// =====================================================
// ✅ Max Consecutive Holidays Policy (NEW)
// key = "MAX_CONSECUTIVE_HOLIDAYS", maxConsecutiveHolidayDays = Int
// =====================================================

const MAX_CONSECUTIVE_KEY = "MAX_CONSECUTIVE_HOLIDAYS";
const DEFAULT_MAX_CONSECUTIVE = 0;

const normalizeMaxConsecutive = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  const intVal = Math.floor(num);
  if (intVal < 0 || intVal > 365) return null; // 0-365
  return intVal;
};

// ✅ GET /api/holidays/max-consecutive
exports.getMaxConsecutivePolicy = async (req, res) => {
  try {
    const row = await prisma.holidayPolicy.findUnique({
      where: { key: MAX_CONSECUTIVE_KEY },
      select: { key: true, maxConsecutiveHolidayDays: true, updatedAt: true, updatedBy: true },
    });

    const maxConsecutiveHolidayDays =
      row?.maxConsecutiveHolidayDays !== null && row?.maxConsecutiveHolidayDays !== undefined
        ? Number(row.maxConsecutiveHolidayDays)
        : DEFAULT_MAX_CONSECUTIVE;

    return res.json({
      key: MAX_CONSECUTIVE_KEY,
      maxConsecutiveHolidayDays,
      updatedAt: row?.updatedAt || null,
      updatedBy: row?.updatedBy || null,
    });
  } catch (error) {
    console.error("getMaxConsecutivePolicy Error:", error);
    return res.status(500).json({ error: "Failed to fetch max consecutive policy" });
  }
};

// ✅ PUT /api/holidays/max-consecutive (HR)
// body: { days: number }  (รองรับ { maxConsecutiveHolidayDays } เผื่อเรียกแบบอื่น)
exports.saveMaxConsecutivePolicy = async (req, res) => {
  try {
    const hrId = req.user.id;

    const incomingRaw = req.body?.days ?? req.body?.maxConsecutiveHolidayDays;
    const incoming = normalizeMaxConsecutive(incomingRaw);

    if (incoming === null) {
      return res.status(400).json({
        error: "days must be a number between 0 and 365",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldRow = await tx.holidayPolicy.findUnique({
        where: { key: MAX_CONSECUTIVE_KEY },
      });

      // 1) upsert policy
      const saved = await tx.holidayPolicy.upsert({
        where: { key: MAX_CONSECUTIVE_KEY },
        create: {
          key: MAX_CONSECUTIVE_KEY,
          maxConsecutiveHolidayDays: incoming,
          updatedBy: hrId,
        },
        update: {
          maxConsecutiveHolidayDays: incoming,
          updatedBy: hrId,
        },
      });

      // 2) apply ไปยังทุก LeaveType (ทุกประเภทวันลา)
      const updateManyResult = await tx.leaveType.updateMany({
        data: { maxConsecutiveDays: incoming },
      });

      const oldVal = Number(oldRow?.maxConsecutiveHolidayDays ?? DEFAULT_MAX_CONSECUTIVE);

      const auditDetails = `HR updated Max Consecutive Holidays policy: ${oldVal} -> ${incoming} day(s) (applied to ALL leave types). Updated leave types: ${updateManyResult.count}`;

      // ✅ กัน auditLog พังแล้ว rollback ทั้ง transaction
      try {
        await auditLog(tx, {
          action: oldRow ? "UPDATE" : "CREATE",
          modelName: "HolidayPolicy",
          recordId: oldRow?.id || saved?.id || 0,
          userId: hrId,
          details: auditDetails,
          oldValue: oldRow || null,
          newValue: saved,
          req: req,
        });
      } catch (e) {
        console.error("[AUDIT LOG ERROR - ignored to avoid rollback]", e);
      }

      // (optional) sample ดูค่าใน DB หลัง update เพื่อเช็ค
      const sample = await tx.leaveType.findMany({
        select: { id: true, typeName: true, maxConsecutiveDays: true },
        orderBy: { id: "asc" },
        take: 10,
      });

      return {
        saved,
        auditDetails,
        action: oldRow ? "UPDATE" : "CREATE",
        updatedLeaveTypes: updateManyResult.count,
        sample,
      };
    });

    // Real-time Notification (Socket.io)
    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: result.action,
        modelName: "HolidayPolicy",
        recordId: 0,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails,
        createdAt: new Date(),
      });
    }

    return res.json({
      message: "Max consecutive policy saved successfully",
      data: result.saved,
      updatedLeaveTypes: result.updatedLeaveTypes, // ✅ สำคัญ: อัปเดตไปกี่แถว
      sample: result.sample, // ✅ เช็คได้ทันทีว่าเปลี่ยนจริงไหม
    });
  } catch (error) {
    console.error("saveMaxConsecutivePolicy Error:", error);
    return res.status(400).json({
      error: error.message || "Failed to save max consecutive policy",
    });
  }
};

// =====================================================
// ✅ Holiday CRUD (ของเดิมคุณ)
// =====================================================

// 1) สร้างวันหยุด (พร้อม Validation)
exports.createHoliday = async (req, res) => {
  try {
    const { holidays } = req.body;
    const hrId = req.user.id;

    const holidayList = Array.isArray(holidays) ? holidays : [req.body];

    const result = await prisma.$transaction(async (tx) => {
      const addedHolidays = [];

      for (const item of holidayList) {
        const { date, name, isSubsidy } = item;

        if (!date || !name) continue;

        const targetDate = normalizeDate(date);

        const existing = await tx.holiday.findUnique({
          where: { date: targetDate },
        });

        if (!existing) {
          const newHoliday = await tx.holiday.create({
            data: {
              date: targetDate,
              name: name.trim(),
              isSubsidy: isSubsidy || false,
            },
          });
          addedHolidays.push(newHoliday);
        }
      }

      const auditDetails = `HR added ${addedHolidays.length} new holidays.`;

      if (addedHolidays.length > 0) {
        await auditLog(tx, {
          action: "CREATE",
          modelName: "Holiday",
          recordId: 0,
          userId: hrId,
          details: auditDetails,
          newValue: addedHolidays,
          req: req,
        });
      }

      return { addedHolidays, auditDetails };
    });

    const io = req.app.get("io");
    if (io && result.addedHolidays.length > 0) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "Holiday",
        recordId: result.addedHolidays.length,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails,
        createdAt: new Date(),
      });
    }

    res.json({
      message: `Processed ${holidayList.length} items.`,
      addedCount: result.addedHolidays.length,
      data: result.addedHolidays,
    });
  } catch (error) {
    console.error("createHoliday Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// 2) แก้ไขวันหยุด (Update)
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, isSubsidy } = req.body;
    const hrId = req.user.id;
    const holidayId = parseInt(id, 10);

    if (!date && !name && isSubsidy === undefined) {
      throw new Error("No data provided for update.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldHoliday = await tx.holiday.findUnique({
        where: { id: holidayId },
      });

      if (!oldHoliday) throw new Error("Holiday not found.");

      const dataToUpdate = {};
      if (name) dataToUpdate.name = name.trim();
      if (isSubsidy !== undefined) dataToUpdate.isSubsidy = isSubsidy;

      if (date) {
        const targetDate = normalizeDate(date);

        const conflict = await tx.holiday.findFirst({
          where: {
            date: targetDate,
            NOT: { id: holidayId },
          },
        });
        if (conflict) throw new Error("New date already exists in another holiday record.");
        dataToUpdate.date = targetDate;
      }

      const updated = await tx.holiday.update({
        where: { id: holidayId },
        data: dataToUpdate,
      });

      const auditDetails = `Updated holiday: ${oldHoliday.name} -> ${updated.name}`;

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Holiday",
        recordId: holidayId,
        userId: hrId,
        details: auditDetails,
        oldValue: oldHoliday,
        newValue: updated,
        req: req,
      });

      return { updated, auditDetails };
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "Holiday",
        recordId: holidayId,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails,
        createdAt: new Date(),
      });
    }

    res.json({ message: "Holiday updated successfully", data: result.updated });
  } catch (error) {
    console.error("updateHoliday Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// 3) ดึงข้อมูล (Get)
exports.getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const startDate = new Date(currentYear, 0, 1, 0, 0, 0);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    });

    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch holidays" });
  }
};

// 4) ลบวันหยุด (Delete)
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const hrId = req.user.id;
    const holidayId = parseInt(id, 10);

    if (!holidayId) return res.status(400).json({ error: "Invalid holiday ID" });

    const result = await prisma.$transaction(async (tx) => {
      const oldHoliday = await tx.holiday.findUnique({
        where: { id: holidayId },
      });

      if (!oldHoliday) {
        throw new Error("Holiday not found.");
      }

      await tx.holiday.delete({
        where: { id: holidayId },
      });

      const auditDetails = `HR deleted holiday: ${oldHoliday.name} (${oldHoliday.date
        .toISOString()
        .split("T")[0]})`;

      await auditLog(tx, {
        action: "DELETE",
        modelName: "Holiday",
        recordId: holidayId,
        userId: hrId,
        details: auditDetails,
        oldValue: oldHoliday,
        newValue: null,
        req: req,
      });

      return { oldHoliday, auditDetails };
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "DELETE",
        modelName: "Holiday",
        recordId: holidayId,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails,
        createdAt: new Date(),
      });
    }

    res.json({
      message: "Holiday deleted successfully",
      data: result.oldHoliday,
    });
  } catch (error) {
    console.error("deleteHoliday Error:", error);
    res.status(400).json({
      error: error.message || "Failed to delete: Holiday not found",
    });
  }
};
