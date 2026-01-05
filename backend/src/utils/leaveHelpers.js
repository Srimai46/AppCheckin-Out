// backend/src/utils/leaveHelpers.js

// แปลง Date -> YYYY-MM-DD (ตาม local time)
const toLocalYMD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Map วันในสัปดาห์ให้เป็น key แบบเดียวกับ FE/Policy
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// default policy (ถ้า DB ยังไม่มี)
const DEFAULT_WORKING_DAYS = ["MON", "TUE", "WED", "THU", "FRI"];

// normalize workingDays input
const normalizeWorkingDays = (workingDays) => {
  const arr = Array.isArray(workingDays) ? workingDays : [];
  const cleaned = arr
    .map((x) => String(x || "").trim().toUpperCase())
    .filter((x) => DOW.includes(x));
  return [...new Set(cleaned)];
};

// helper: set hours to noon (เลี่ยง timezone offset)
const toNoon = (date) => {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
};

// helper: เช็ควันทำงาน (ตาม policy) + ไม่ใช่ holiday
const makeIsWorkingDay = (holidayDates = [], workingDays = DEFAULT_WORKING_DAYS) => {
  const holidaySet = new Set(Array.isArray(holidayDates) ? holidayDates : []);
  const wd = normalizeWorkingDays(workingDays);
  const workingSet = new Set(wd.length ? wd : DEFAULT_WORKING_DAYS);

  return (d) => {
    const dayKey = DOW[d.getDay()];
    const dateStr = toLocalYMD(d);
    const isHoliday = holidaySet.has(dateStr);
    const isWorking = workingSet.has(dayKey);
    return isWorking && !isHoliday;
  };
};

// =========================================
// ✅ 1) คำนวณวันลาสุทธิ (รองรับ workingDays policy)
// =========================================
exports.calculateTotalDays = (
  start,
  end,
  startDuration = "Full",
  endDuration = "Full",
  holidayDates = [],              // ["YYYY-MM-DD", ...] จากตาราง holiday
  workingDays = DEFAULT_WORKING_DAYS // ["MON","TUE",... ] จาก policy
) => {
  if (!start || !end) return 0;

  const s = toNoon(start);
  const e = toNoon(end);

  if (s > e) return 0;

  const isWorkingDay = makeIsWorkingDay(holidayDates, workingDays);

  // 1) นับจำนวน "วันทำงาน" ทั้งหมดในช่วงนั้นก่อน
  let workingDaysCount = 0;
  let cur = new Date(s);

  while (cur <= e) {
    if (isWorkingDay(cur)) workingDaysCount++;
    cur.setDate(cur.getDate() + 1);
  }

  if (workingDaysCount === 0) return 0;

  // 2) คำนวณส่วนลด (Deduction) จากครึ่งวัน
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

  return Math.max(0, workingDaysCount - deduction);
};

// =========================================
// ✅ 2) รายชื่อ "วันทำงาน" ในช่วง (รองรับ workingDays policy)
// =========================================
exports.getWorkingDaysList = (
  start,
  end,
  holidayDates = [],
  workingDays = DEFAULT_WORKING_DAYS
) => {
  if (!start || !end) return [];

  const s = toNoon(start);
  const e = toNoon(end);

  if (s > e) return [];

  const isWorkingDay = makeIsWorkingDay(holidayDates, workingDays);

  const list = [];
  const cur = new Date(s);

  while (cur <= e) {
    if (isWorkingDay(cur)) list.push(toLocalYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return list;
};

// =========================================
// ✅ 3) บังคับ: ห้ามลาใน "วันหยุด"
// นิยามวันหยุดของระบบนี้ =
// - วันที่อยู่ใน holidayDates (วันหยุดพิเศษใน DB)
// - หรือวันที่ "ไม่อยู่" ใน workingDays policy (วันไม่ทำงาน เช่น เสาร์/อาทิตย์ หรือวันอื่นที่กำหนด)
// =========================================
exports.getBlockedLeaveDates = (
  start,
  end,
  holidayDates = [],
  workingDays = DEFAULT_WORKING_DAYS
) => {
  if (!start || !end) return [];

  const s = toNoon(start);
  const e = toNoon(end);
  if (s > e) return [];

  const holidaySet = new Set(Array.isArray(holidayDates) ? holidayDates : []);
  const wd = normalizeWorkingDays(workingDays);
  const workingSet = new Set(wd.length ? wd : DEFAULT_WORKING_DAYS);

  const blocked = [];
  const cur = new Date(s);

  while (cur <= e) {
    const dateStr = toLocalYMD(cur);
    const dayKey = DOW[cur.getDay()];

    const isHoliday = holidaySet.has(dateStr);
    const isWorking = workingSet.has(dayKey);

    // blocked ถ้าเป็นวันหยุดพิเศษ หรือเป็นวันไม่ทำงานตาม policy
    if (isHoliday || !isWorking) {
      blocked.push({
        date: dateStr,
        reason: isHoliday ? "HOLIDAY" : "NON_WORKING_DAY",
        dayKey,
      });
    }

    cur.setDate(cur.getDate() + 1);
  }

  return blocked;
};
