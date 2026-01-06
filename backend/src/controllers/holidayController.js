// backend/src/controllers/holidayController.js
const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger");

const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ฟังก์ชันช่วยดึงชื่อวันหยุด (รองรับทั้ง JSON และ String เก่า)
const getHolidayNameStr = (nameField) => {
  if (!nameField) return "Unknown";
  if (typeof nameField === "string") return nameField; // เผื่อข้อมูลเก่า
  return nameField.th || nameField.en || "Unnamed";
};

// =====================================================
// ✅ Working Days Policy (ส่วนนี้เหมือนเดิม ไม่ต้องแก้)
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
// ✅ Max Consecutive Policy (ส่วนนี้เหมือนเดิม ไม่ต้องแก้)
// =====================================================
const MAX_CONSECUTIVE_KEY = "MAX_CONSECUTIVE_HOLIDAYS";
const DEFAULT_MAX_CONSECUTIVE = 0;

const normalizeMaxConsecutive = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  const intVal = Math.floor(num);
  if (intVal < 0 || intVal > 365) return null;
  return intVal;
};

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

      const updateManyResult = await tx.leaveType.updateMany({
        data: { maxConsecutiveDays: incoming },
      });

      const oldVal = Number(oldRow?.maxConsecutiveHolidayDays ?? DEFAULT_MAX_CONSECUTIVE);

      const auditDetails = `HR updated Max Consecutive Holidays policy: ${oldVal} -> ${incoming} day(s) (applied to ALL leave types). Updated leave types: ${updateManyResult.count}`;

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
      updatedLeaveTypes: result.updatedLeaveTypes,
      sample: result.sample,
    });
  } catch (error) {
    console.error("saveMaxConsecutivePolicy Error:", error);
    return res.status(400).json({
      error: error.message || "Failed to save max consecutive policy",
    });
  }
};

// =====================================================
// ✅ Holiday CRUD (แก้ไขส่วนนี้)
// =====================================================

// 1) สร้างวันหยุด (พร้อม Validation JSON)
exports.createHoliday = async (req, res) => {
  try {
    const { holidays } = req.body;
    const hrId = req.user.id;

    const holidayList = Array.isArray(holidays) ? holidays : [req.body];

    const result = await prisma.$transaction(async (tx) => {
      const addedHolidays = [];

      for (const item of holidayList) {
        const { date, name, isSubsidy } = item;

        // ✅ แก้ไข: เช็ค name เป็น Object และต้องมีภาษาไทย (หรือ check แค่ !name ก็ได้ถ้าไม่ซีเรียส)
        if (!date || !name || (typeof name === 'object' && !name.th)) continue;

        const targetDate = normalizeDate(date);

        const existing = await tx.holiday.findUnique({
          where: { date: targetDate },
        });

        if (!existing) {
          const newHoliday = await tx.holiday.create({
            data: {
              date: targetDate,
              name: name, // ✅ ส่ง Object ตรงๆ ห้าม trim()
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
    const { date, name, isSubsidy } = req.body; // name is Object
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
      
      // ✅ แก้ไข: รับค่า name เป็น Object (ไม่ต้อง trim)
      if (name) dataToUpdate.name = name;
      
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

      // ✅ แก้ไข: ดึงชื่อมาแสดงผลใน Audit Log ให้ถูกต้อง (ไม่ให้ขึ้น [object Object])
      const oldNameStr = getHolidayNameStr(oldHoliday.name);
      const newNameStr = getHolidayNameStr(updated.name);

      const auditDetails = `Updated holiday: ${oldNameStr} -> ${newNameStr}`;

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

      // ✅ แก้ไข: ดึงชื่อมาแสดงผลให้ถูกต้อง
      const holidayNameStr = getHolidayNameStr(oldHoliday.name);
      
      const auditDetails = `HR deleted holiday: ${holidayNameStr} (${oldHoliday.date
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