exports.calculateTotalDays = (start, end, startDuration = "Full", endDuration = "Full") => {
  if (!start || !end) return 0;

  // ✅ Normalize ให้เป็นเที่ยงวัน (กันปัญหาเวลา/ข้ามวัน)
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(12, 0, 0, 0);
  e.setHours(12, 0, 0, 0);

  // ถ้าวันที่สลับกัน (start > end) ให้ 0
  if (s > e) return 0;

  const isWeekday = (d) => {
    const day = d.getDay(); // 0 อาทิตย์, 6 เสาร์
    return day !== 0 && day !== 6;
  };

  const sameYMD = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // ✅ นับจำนวน "วันทำงาน" ระหว่าง start..end (รวมปลายทาง)
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    if (isWeekday(cur)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }

  if (count === 0) return 0;

  // ✅ กรณีลาวันเดียวกัน (คิดเฉพาะถ้าวันนั้นเป็นวันทำงาน)
  if (sameYMD(s, e)) {
    if (!isWeekday(s)) return 0;

    // วันเดียว: ถ้า Full = 1, ถ้า Half = 0.5
    // (คุณใช้ "Full" กับค่าอื่นเป็นครึ่งวัน)
    return startDuration === "Full" ? 1 : 0.5;
  }

  // ✅ กรณีหลายวัน: หัก 0.5 เฉพาะวันแรก/วันสุดท้ายที่เป็นวันทำงานเท่านั้น
  let deduction = 0;

  if (isWeekday(s) && startDuration !== "Full") deduction += 0.5;
  if (isWeekday(e) && endDuration !== "Full") deduction += 0.5;

  // กันผลลบ
  const result = count - deduction;
  return Math.max(0, result);
};
