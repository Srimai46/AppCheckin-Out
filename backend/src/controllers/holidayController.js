const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { auditLog } = require("../utils/logger");

const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 1. สร้างวันหยุด (พร้อม Validation)
exports.createHoliday = async (req, res) => {
  try {
    const { holidays } = req.body;
    const hrId = req.user.id;
    // ตรวจสอบว่าเป็น Array หรือไม่ ถ้าเป็น Object เดียวให้เปลี่ยนเป็น Array
    const holidayList = Array.isArray(holidays) ? holidays : [req.body];

    const result = await prisma.$transaction(async (tx) => {
      const addedHolidays = [];

      for (const item of holidayList) {
        const { date, name, isSubsidy } = item;

        // ✅ Validation เบื้องต้น
        if (!date || !name) continue;

        const targetDate = normalizeDate(date);

        // ตรวจสอบวันที่ซ้ำภายใน Transaction
        const existing = await tx.holiday.findUnique({
          where: { date: targetDate }
        });

        if (!existing) {
          const newHoliday = await tx.holiday.create({
            data: {
              date: targetDate,
              name: name.trim(),
              isSubsidy: isSubsidy || false
            }
          });
          addedHolidays.push(newHoliday);
        }
      }

      // ✅ บันทึก Audit Log เมื่อมีการเพิ่มวันหยุดสำเร็จอย่างน้อย 1 รายการ
      if (addedHolidays.length > 0) {
        await auditLog(tx, {
          action: "CREATE",
          modelName: "Holiday",
          recordId: 0, // ใช้ 0 หรือ ID ตัวแรกสำหรับการเพิ่มแบบกลุ่ม
          userId: hrId,
          details: `HR added ${addedHolidays.length} new holidays.`,
          newValue: addedHolidays, // เก็บรายการวันหยุดทั้งหมดที่เพิ่มใน Log
          req: req
        });
      }

      return addedHolidays;
    });

    res.json({ 
      message: `Processed ${holidayList.length} items.`, 
      addedCount: result.length,
      data: result 
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

    // ✅ 1. Validation เบื้องต้น
    if (!date && !name && isSubsidy === undefined) {
      throw new Error("No data provided for update.");
    }

    const result = await prisma.$transaction(async (tx) => {
      // ✅ 2. ดึงข้อมูลเดิมเก็บไว้เป็น oldValue
      const oldHoliday = await tx.holiday.findUnique({
        where: { id: holidayId }
      });

      if (!oldHoliday) throw new Error("Holiday not found.");

      const dataToUpdate = {};
      if (name) dataToUpdate.name = name.trim();
      if (isSubsidy !== undefined) dataToUpdate.isSubsidy = isSubsidy;
      
      if (date) {
        const targetDate = normalizeDate(date);
        // ตรวจสอบวันที่ซ้ำ (ยกเว้น ID ตัวเอง)
        const conflict = await tx.holiday.findFirst({
          where: { 
            date: targetDate,
            NOT: { id: holidayId }
          }
        });
        if (conflict) throw new Error("New date already exists in another holiday record.");
        dataToUpdate.date = targetDate;
      }

      // ✅ 3. อัปเดตข้อมูล
      const updated = await tx.holiday.update({
        where: { id: holidayId },
        data: dataToUpdate
      });

      // ✅ 4. บันทึก Audit Log
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Holiday",
        recordId: holidayId,
        userId: hrId,
        details: `Updated holiday: ${oldHoliday.name} -> ${updated.name}`,
        oldValue: oldHoliday, // ข้อมูลก่อนเปลี่ยน
        newValue: updated,    // ข้อมูลหลังเปลี่ยน
        req: req
      });

      return updated;
    });

    res.json({ message: "Holiday updated successfully", data: result });
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
      orderBy: { date: 'asc' }
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
        where: { id: holidayId }
      });

      if (!oldHoliday) {
        throw new Error("Holiday not found.");
      }

      // ✅ 2. ทำการลบข้อมูล
      await tx.holiday.delete({
        where: { id: holidayId }
      });

      // ✅ 3. บันทึก Audit Log (Action: DELETE)
      await auditLog(tx, {
        action: "DELETE",
        modelName: "Holiday",
        recordId: holidayId,
        userId: hrId,
        details: `HR deleted holiday: ${oldHoliday.name} (${oldHoliday.date.toISOString().split('T')[0]})`,
        oldValue: oldHoliday, // เก็บก้อนข้อมูลที่ลบไว้ทั้งหมด
        newValue: null,       // ข้อมูลใหม่ไม่มีเพราะถูกลบไปแล้ว
        req: req
      });

      return oldHoliday;
    });

    res.json({ 
      message: "Holiday deleted successfully", 
      data: result 
    });

  } catch (error) {
    console.error("deleteHoliday Error:", error);
    res.status(400).json({ 
      error: error.message || "Failed to delete: Holiday not found" 
    });
  }
};