const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { auditLog } = require("../utils/logger");

const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
};

// =====================================================
// ✅ Working Days Policy (NEW)
// เก็บใน DB ผ่านตาราง/โมเดล "HolidayPolicy" (แนะนำ)
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

  // unique keep order
  return [...new Set(cleaned)];
};

// ✅ GET /api/holidays/working-days
exports.getWorkingDaysPolicy = async (req, res) => {
  try {
    // ต้องมี model HolidayPolicy ใน prisma (เดี๋ยวคุณส่ง schema มา ผมจะจัดให้)
    const row = await prisma.holidayPolicy.findUnique({
      where: { key: WORKING_DAYS_KEY },
      select: { key: true, workingDays: true, updatedAt: true, updatedBy: true },
    });

    const workingDays = Array.isArray(row?.workingDays) ? row.workingDays : DEFAULT_WORKING_DAYS;

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
      return res.status(400).json({ error: "workingDays must have at least 1 valid day" });
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

      const auditDetails = `HR updated Working Days policy: [${(oldRow?.workingDays || DEFAULT_WORKING_DAYS).join(
        ", "
      )}] -> [${incoming.join(", ")}]`;

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
        action: result.action, // CREATE / UPDATE
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
    res.status(400).json({ error: error.message || "Failed to save working days policy" });
  }
};

// =====================================================
// ✅ Holiday CRUD (ของเดิมคุณ)
// =====================================================

// 1. สร้างวันหยุด (พร้อม Validation)
exports.createHoliday = async (req, res) => {
  try {
    const { holidays } = req.body;
    const hrId = req.user.id;
    // Check if it's an Array, if single object convert to Array
    const holidayList = Array.isArray(holidays) ? holidays : [req.body];

    const result = await prisma.$transaction(async (tx) => {
      const addedHolidays = [];

      for (const item of holidayList) {
        const { date, name, isSubsidy } = item;

        // Validation
        if (!date || !name) continue;

        const targetDate = normalizeDate(date);

        // Check for duplicates
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

      // Database Audit Log
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

    // Real-time Notification (Socket.io)
    const io = req.app.get("io");
    if (io && result.addedHolidays.length > 0) {
      // 1. Refresh calendars on client side
      io.emit("notification_refresh");

      // 2. Show on System Activities screen
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE", // Green color
        modelName: "Holiday",
        recordId: result.addedHolidays.length, // Display count as ID or 0
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails, // "HR added X new holidays."
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

// 2. แก้ไขวันหยุด (Update)
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, isSubsidy } = req.body;
    const hrId = req.user.id;
    const holidayId = parseInt(id, 10);

    // 1. Validation
    if (!date && !name && isSubsidy === undefined) {
      throw new Error("No data provided for update.");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 2. Get old data
      const oldHoliday = await tx.holiday.findUnique({
        where: { id: holidayId },
      });

      if (!oldHoliday) throw new Error("Holiday not found.");

      const dataToUpdate = {};
      if (name) dataToUpdate.name = name.trim();
      if (isSubsidy !== undefined) dataToUpdate.isSubsidy = isSubsidy;

      if (date) {
        const targetDate = normalizeDate(date);
        // Check duplicate
        const conflict = await tx.holiday.findFirst({
          where: {
            date: targetDate,
            NOT: { id: holidayId },
          },
        });
        if (conflict) throw new Error("New date already exists in another holiday record.");
        dataToUpdate.date = targetDate;
      }

      // 3. Update
      const updated = await tx.holiday.update({
        where: { id: holidayId },
        data: dataToUpdate,
      });

      const auditDetails = `Updated holiday: ${oldHoliday.name} -> ${updated.name}`;

      // 4. Database Audit Log
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

    // Real-time Notification (Socket.io)
    const io = req.app.get("io");
    if (io) {
      // 1. Refresh calendars
      io.emit("notification_refresh");

      // 2. Show on System Activities screen
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE", // Orange color
        modelName: "Holiday",
        recordId: holidayId,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails, // "Updated holiday: Old -> New"
        createdAt: new Date(),
      });
    }

    res.json({ message: "Holiday updated successfully", data: result.updated });
  } catch (error) {
    console.error("updateHoliday Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// 3. ดึงข้อมูล (Get)
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

// 4. ลบวันหยุด (Delete)
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const hrId = req.user.id;
    const holidayId = parseInt(id, 10);

    if (!holidayId) return res.status(400).json({ error: "Invalid holiday ID" });

    const result = await prisma.$transaction(async (tx) => {
      // ✅ 1. ต้องดึงข้อมูลไว้ก่อนที่จะลบ เพื่อเก็บลง Audit Log
      const oldHoliday = await tx.holiday.findUnique({
        where: { id: holidayId },
      });

      if (!oldHoliday) {
        throw new Error("Holiday not found.");
      }

      // ✅ 2. ทำการลบข้อมูล
      await tx.holiday.delete({
        where: { id: holidayId },
      });

      const auditDetails = `HR deleted holiday: ${oldHoliday.name} (${oldHoliday.date.toISOString().split("T")[0]})`;

      // ✅ 3. บันทึก Audit Log (Action: DELETE) ลง Database
      await auditLog(tx, {
        action: "DELETE",
        modelName: "Holiday",
        recordId: holidayId,
        userId: hrId,
        details: auditDetails,
        oldValue: oldHoliday, // เก็บก้อนข้อมูลที่ลบไว้ทั้งหมด
        newValue: null, // ข้อมูลใหม่ไม่มีเพราะถูกลบไปแล้ว
        req: req,
      });

      return { oldHoliday, auditDetails };
    });

    // 4. ส่วน Real-time (Socket.io)
    const io = req.app.get("io");
    if (io) {
      // 4.1 สั่งให้หน้าปฏิทินรีเฟรช (วันหยุดที่ลบจะหายไปทันที)
      io.emit("notification_refresh");

      // 4.2 ส่ง Audit Log ไปแสดงบนหน้าจอ System Activities
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "DELETE", // ใช้สีแดง เพื่อบอกว่าเป็นการลบ
        modelName: "Holiday",
        recordId: holidayId,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails, // "HR deleted holiday: ..."
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
