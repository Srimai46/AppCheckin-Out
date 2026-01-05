// backend/src/utils/leaveHelpers.js

const toLocalYMD = (date) => {
  const d = new Date(date);
  // ป้องกันกรณี date object เปลี่ยนค่า ให้ clone มาใหม่
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


exports.calculateTotalDays = (
  start,
  end,
  startDuration = "Full",
  endDuration = "Full",
  holidayDates = [] // ["YYYY-MM-DD", ...]
) => {
  if (!start || !end) return 0;

  const s = new Date(start);
  const e = new Date(end);
  // Set เที่ยงวัน เพื่อเลี่ยงปัญหา Timezone
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  if (s > e) return 0;

  const isWorkingDay = (d) => {
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6; // 0=Sun, 6=Sat
    const dateStr = toLocalYMD(d); // ✅ ใช้ Helper เดียวกัน
    const isHoliday = holidayDates.includes(dateStr);
    return !isWeekend && !isHoliday;
  };

  // 1. นับจำนวนวันทำงานทั้งหมดในช่วงนั้นก่อน
  let workingDaysCount = 0;
  let cur = new Date(s);
  while (cur <= e) {
    if (isWorkingDay(cur)) workingDaysCount++;
    cur.setDate(cur.getDate() + 1);
  }

  if (workingDaysCount === 0) return 0;

  // 2. คำนวณส่วนลด (Deduction)
  let deduction = 0;

  // วันแรก: ถ้าเป็นวันทำงาน แต่ลาครึ่งวัน
  if (isWorkingDay(s) && startDuration !== "Full") {
    deduction += 0.5;
  }

  // วันสุดท้าย: ถ้าคนละวันกับวันแรก และเป็นวันทำงาน แต่ลาครึ่งวัน
  const isSameDay = s.getTime() === e.getTime();
  if (!isSameDay && isWorkingDay(e) && endDuration !== "Full") {
    deduction += 0.5;
  }

  // 3. ผลลัพธ์สุทธิ (ต้องไม่ต่ำกว่า 0)
  return Math.max(0, workingDaysCount - deduction);
};

exports.getWorkingDaysList = (start, end, holidayDates = []) => {
  if (!start || !end) return [];

  const s = new Date(start);
  const e = new Date(end);
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  if (s > e) return [];

  const list = [];
  const cur = new Date(s);

  while (cur <= e) {
    const dayOfWeek = cur.getDay();
    const dateStr = toLocalYMD(cur); // ✅ ใช้ Helper เดียวกัน

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      list.push(dateStr);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return list;
};
