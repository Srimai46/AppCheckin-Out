exports.calculateTotalDays = (
  start,
  end,
  startDuration = "Full",
  endDuration = "Full",
  holidayDates = [] // คาดหวังรูปแบบ ["YYYY-MM-DD", ...]
) => {
  if (!start || !end) return 0;

  // 1. กำหนดวันที่เริ่มต้นและสิ้นสุด โดยเซ็ตเวลาให้อยู่กลางวันเสมอ (เพื่อเลี่ยงปัญหา Timezone/DST)
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  if (s > e) return 0;

  // ✅ ฟังก์ชันเช็ควันทำงาน (ไม่เป็น ส-อ และไม่อยู่ใน holidayDates)
  const isWorkingDay = (d) => {
    const day = d.getDay(); // 0 = อาทิตย์, 6 = เสาร์
    const isWeekend = day === 0 || day === 6;

    // ดึงค่าวันที่แบบ Local Time ให้เป็นฟอร์แมต YYYY-MM-DD เพื่อเทียบกับฐานข้อมูล
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${date}`;

    const isHoliday = holidayDates.includes(dateStr);

    return !isWeekend && !isHoliday;
  };

  const sameYMD = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // 2. นับจำนวน "วันทำงาน" จริงในช่วงวันที่เลือก
  let count = 0;
  let cur = new Date(s);
  while (cur <= e) {
    if (isWorkingDay(cur)) {
      count += 1;
    }
    cur.setDate(cur.getDate() + 1);
    cur.setHours(12, 0, 0, 0); 
  }

  if (count === 0) return 0;

  // 3. กรณีลาวันเดียวกัน (เช่น ลาครึ่งวันในวันทำงาน)
  if (sameYMD(s, e)) {
    if (!isWorkingDay(s)) return 0;
    return startDuration === "Full" ? 1 : 0.5;
  }

  // 4. กรณีลาหลายวัน: คำนวณส่วนลด (Deduction) จากวันแรกและวันสุดท้าย
  let deduction = 0;
  
  // หักออก 0.5 หากวันแรกเป็นวันทำงานแต่ลาไม่เต็มวัน
  if (isWorkingDay(s) && startDuration !== "Full") {
    deduction += 0.5;
  }
  
  // หักออก 0.5 หากวันสุดท้ายเป็นวันทำงานแต่ลาไม่เต็มวัน
  if (isWorkingDay(e) && endDuration !== "Full") {
    deduction += 0.5;
  }

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
