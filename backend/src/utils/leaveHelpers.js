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
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  if (s > e) return 0;

  const isWorkingDay = (d) => {
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    const dateStr = d.toISOString().split('T')[0]; // สั้นกว่าและแม่นยำเพราะเราเซ็ต 12:00 ไว้แล้ว
    const isHoliday = holidayDates.includes(dateStr);
    return !isWeekend && !isHoliday;
  };

  // 1. นับจำนวนวันทำงานทั้งหมดในช่วงนั้นก่อน (ถ้านับได้ 0 คือจบเลย)
  let workingDaysCount = 0;
  let cur = new Date(s);
  while (cur <= e) {
    if (isWorkingDay(cur)) workingDaysCount++;
    cur.setDate(cur.getDate() + 1);
  }

  if (workingDaysCount === 0) return 0;

  // 2. คำนวณส่วนลด (Deduction)
  let deduction = 0;

  // ตรวจสอบวันแรก: ถ้าเป็นวันทำงานแต่ลาไม่เต็มวัน หักออก 0.5
  if (isWorkingDay(s) && startDuration !== "Full") {
    deduction += 0.5;
  }

  // ตรวจสอบวันสุดท้าย: 
  // ต้องเช็คก่อนว่าไม่ใช่ลาวันเดียวกัน (เพราะถ้าวันเดียวจะโดนหักซ้ำซ้อน)
  const isSameDay = s.getTime() === e.getTime();
  if (!isSameDay && isWorkingDay(e) && endDuration !== "Full") {
    deduction += 0.5;
  }

  // 3. ผลลัพธ์สุทธิ
  return Math.max(0, workingDaysCount - deduction);
};

exports.getWorkingDaysList = (start, end, holidayDates = []) => {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  const list = [];
  const cur = new Date(s);

  while (cur <= e) {
    const dayOfWeek = cur.getDay(); // 0 อาทิตย์, 6 เสาร์
    
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, "0");
    const date = String(cur.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${date}`;

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      list.push(dateStr); 
    }
    cur.setDate(cur.getDate() + 1);
    cur.setHours(12, 0, 0, 0); 
  }
  return list;
};
