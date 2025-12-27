const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 1. สร้างวันหยุด (พร้อม Validation)
exports.createHoliday = async (req, res) => {
  try {
    const { holidays } = req.body;
    const holidayList = Array.isArray(holidays) ? holidays : [req.body];

    const results = [];
    for (const item of holidayList) {
      const { date, name, isSubsidy } = item;

      // ✅ Validation: ตรวจสอบค่าว่าง
      if (!date || !name) {
        continue; // หรือจะ throw error ก็ได้ถ้าต้องการให้หยุดทั้งหมด
      }

      const targetDate = normalizeDate(date);

      // ตรวจสอบวันที่ซ้ำ
      const existing = await prisma.holiday.findUnique({
        where: { date: targetDate }
      });

      if (!existing) {
        const newHoliday = await prisma.holiday.create({
          data: {
            date: targetDate,
            name: name.trim(),
            isSubsidy: isSubsidy || false
          }
        });
        results.push(newHoliday);
      }
    }

    res.json({ 
      message: `Processed ${holidayList.length} items.`, 
      addedCount: results.length,
      data: results 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. แก้ไขวันหยุด (Update)
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, isSubsidy } = req.body;

    // ✅ Validation: ตรวจสอบข้อมูลเบื้องต้น
    if (!date && !name && isSubsidy === undefined) {
      throw new Error("No data provided for update.");
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name.trim();
    if (isSubsidy !== undefined) dataToUpdate.isSubsidy = isSubsidy;
    if (date) {
      const targetDate = normalizeDate(date);
      // ตรวจสอบว่าวันที่ใหม่ไปซ้ำกับ ID อื่นหรือไม่
      const conflict = await prisma.holiday.findFirst({
        where: { 
          date: targetDate,
          NOT: { id: parseInt(id, 10) }
        }
      });
      if (conflict) throw new Error("New date already exists in another holiday record.");
      dataToUpdate.date = targetDate;
    }

    const updated = await prisma.holiday.update({
      where: { id: parseInt(id, 10) },
      data: dataToUpdate
    });

    res.json({ message: "Holiday updated successfully", data: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 3. ดึงข้อมูล (Get)
exports.getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const startDate = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);

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
    await prisma.holiday.delete({ where: { id: parseInt(id, 10) } });
    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete: Holiday not found" });
  }
};