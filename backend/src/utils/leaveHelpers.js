exports.calculateTotalDays = (
  start,
  end,
  startDuration = "Full",
  endDuration = "Full",
  holidayDates = []
) => {
  if (!start || !end) return 0;

  const s = new Date(start);
  const e = new Date(end);
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  if (s > e) return 0;

  // ✅ ปรับ Logic ให้เช็คทั้ง Weekend และ Holidays
  const isWorkingDay = (d) => {
    const day = d.getDay(); // 0 อาทิตย์, 6 เสาร์

    // 💡 แก้จุดนี้: ดึงปี-เดือน-วัน ตามเวลาท้องถิ่น (Local Time)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${date}`; // จะได้ "YYYY-MM-DD" ของไทยจริงๆ

    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidayDates.includes(dateStr);

    return !isWeekend && !isHoliday;
  };

  const sameYMD = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // 1. นับจำนวน "วันทำงาน" จริงๆ
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    if (isWorkingDay(cur)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }

  if (count === 0) return 0;

  // 2. กรณีลาวันเดียวกัน
  if (sameYMD(s, e)) {
    if (!isWorkingDay(s)) return 0;
    return startDuration === "Full" ? 1 : 0.5;
  }

  // 3. กรณีหลายวัน: หัก 0.5 เฉพาะวันแรก/วันสุดท้ายที่เป็นวันทำงาน
  let deduction = 0;
  if (isWorkingDay(s) && startDuration !== "Full") deduction += 0.5;
  if (isWorkingDay(e) && endDuration !== "Full") deduction += 0.5;

  const result = count - deduction;
  return Math.max(0, result);
};

exports.getWorkingDaysList = (start, end, holidayDates = []) => {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  const list = [];
  const cur = new Date(s);

  while (cur <= e) {
    const dayOfWeek = cur.getDay();
    const dateStr = cur.toISOString().split("T")[0];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      list.push(dateStr); // เก็บเฉพาะวันที่เป็นวันทำงานจริง
    }
    cur.setDate(cur.getDate() + 1);
  }
  return list;
};
