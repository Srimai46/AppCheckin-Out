// src/pages/teamCalendar/utils.js
import { format } from "date-fns";
import { SHIFT_START, SHIFT_END } from "./constants";

// --------------------- Leave type matching ---------------------
export const matchLeaveType = (leaveType, filter) => {
  const t = String(leaveType || "").toLowerCase();
  if (filter === "sick") return t.includes("sick") || t.includes("ป่วย");
  if (filter === "personal") return t.includes("personal") || t.includes("กิจ") || t.includes("ธุระ");
  if (filter === "annual") return t.includes("annual") || t.includes("vacation") || t.includes("พักร้อน");
  if (filter === "emergency") return t.includes("emergency") || t.includes("ฉุกเฉิน");
  if (filter === "special") return t.includes("special") || t.includes("พิเศษ");
  return false;
};

// --------------------- Time helpers ---------------------
export const normalizeTime = (t) => {
  if (!t) return null;

  // try Date
  try {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return format(d, "HH:mm");
  } catch (_) {}

  // try plain string
  if (typeof t === "string" && t.includes(":")) return t.slice(0, 5);

  return null;
};

export const getAttendanceState = ({ checkInTime, checkOutTime }) => {
  const hasIn = !!checkInTime;
  const hasOut = !!checkOutTime;
  if (!hasIn) return "NOT_IN";
  if (hasIn && !hasOut) return "IN";
  return "OUT";
};

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// ✅ start/end จาก backend (ถ้ามี) + fallback constants
const getStartFromRow = (row) => {
  const fromStandard = row?.standardConfig?.start;
  if (fromStandard) return String(fromStandard).slice(0, 5);

  const fromRoleConfig = row?.roleConfig?.start;
  if (fromRoleConfig) return String(fromRoleConfig).slice(0, 5);

  const fromWorkConfig = row?.workConfig?.start;
  if (fromWorkConfig) return String(fromWorkConfig).slice(0, 5);

  return SHIFT_START;
};

const getEndFromRow = (row) => {
  const fromStandard = row?.standardConfig?.end;
  if (fromStandard) return String(fromStandard).slice(0, 5);

  const fromRoleConfig = row?.roleConfig?.end;
  if (fromRoleConfig) return String(fromRoleConfig).slice(0, 5);

  const fromWorkConfig = row?.workConfig?.end;
  if (fromWorkConfig) return String(fromWorkConfig).slice(0, 5);

  return SHIFT_END;
};

// late rule:
// - ถ้า row.isLate เป็น boolean -> เชื่อ backend 100%
// - NOT_IN = late เฉพาะ "วันนี้" (now > start)
// - IN/OUT = late ถ้า check-in time > start
export const isLate = (state, inTime, isForToday = true, row = null) => {
  if (typeof row?.isLate === "boolean") return row.isLate;

  const startStr = getStartFromRow(row);
  const startM = toMinutes(startStr);
  if (startM == null) return false;

  if (state === "NOT_IN") return isForToday ? nowMinutes() > startM : false;

  const inM = toMinutes(inTime);
  if (inM == null) return false;

  return inM > startM;
};

// --------------------- Attendance UI helpers ---------------------
export const badgeByAttendance = (state) => {
  if (state === "NOT_IN") return "bg-gray-50 text-gray-500 border-gray-100";
  if (state === "IN") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
};

export const labelByAttendance = (state) => {
  if (state === "NOT_IN") return "NOT CHECKED IN";
  if (state === "IN") return "CHECKED IN";
  return "CHECKED OUT";
};

// --------------------- NEW: Checkout status (แก้เรื่อง Normal/Early) ---------------------
// ใช้ SHIFT_END / config.end เป็น 기준
export const getCheckoutStatus = (checkOutTime, row = null) => {
  if (!checkOutTime) return "NO_CHECKOUT";

  const outTime = normalizeTime(checkOutTime);
  const outM = toMinutes(outTime);
  if (outM == null) return "NORMAL"; // แปลงไม่ได้ก็ให้ normal ไว้ก่อน

  const endStr = getEndFromRow(row);
  const endM = toMinutes(endStr);
  if (endM == null) return "NORMAL";

  // ออกก่อนเวลางาน -> EARLY, ออกตั้งแต่เวลาเลิกงานขึ้นไป -> NORMAL
  return outM < endM ? "EARLY" : "NORMAL";
};

// --------------------- Leave UI helpers ---------------------
export const leaveTheme = (type) => {
  const t = String(type || "").toLowerCase();

  if (t.includes("special") || t.includes("พิเศษ")) {
    return { dot: "bg-rose-400", border: "border-rose-200", bg: "bg-rose-50/60", text: "text-rose-700" };
  }
  if (t.includes("sick") || t.includes("ป่วย")) {
    return { dot: "bg-violet-400", border: "border-violet-200", bg: "bg-violet-50/60", text: "text-violet-700" };
  }
  if (t.includes("personal") || t.includes("กิจ") || t.includes("ธุระ")) {
    return { dot: "bg-sky-400", border: "border-sky-200", bg: "bg-sky-50/60", text: "text-sky-700" };
  }
  if (t.includes("annual") || t.includes("vacation") || t.includes("พักร้อน")) {
    return { dot: "bg-emerald-400", border: "border-emerald-200", bg: "bg-emerald-50/60", text: "text-emerald-700" };
  }
  return { dot: "bg-amber-400", border: "border-amber-200", bg: "bg-amber-50/60", text: "text-amber-700" };
};

export const typeBadgeTheme = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("sick") || t.includes("ป่วย")) return "bg-violet-100 text-violet-700";
  if (t.includes("personal") || t.includes("กิจ") || t.includes("ธุระ")) return "bg-sky-100 text-sky-700";
  if (t.includes("annual") || t.includes("vacation") || t.includes("พักร้อน")) return "bg-emerald-100 text-emerald-700";
  if (t.includes("special") || t.includes("พิเศษ")) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
};

export const weekendBgByDow = (dow) => {
  if (dow === 6) return "bg-violet-50/70"; // Saturday
  if (dow === 0) return "bg-rose-50/70"; // Sunday
  return "";
};

export const buildRowName = (leaf) => {
  return (
    leaf?.name ||
    leaf?.employee?.fullName ||
    `${leaf?.employee?.firstName || ""} ${leaf?.employee?.lastName || ""}`.trim() ||
    "Unknown"
  );
};

export const buildDurationText = (leaf) => {
  const s = leaf?.startDate ? new Date(leaf.startDate).toLocaleDateString("th-TH") : "-";
  const e = leaf?.endDate ? new Date(leaf.endDate).toLocaleDateString("th-TH") : "-";
  const days = leaf?.totalDaysRequested != null ? `${leaf.totalDaysRequested} Days` : "";
  return { range: `${s} - ${e}`, days };
};

// ===================== ✅ NEW: Status In/Out =====================
export const getInStatus = (row, isForToday = true) => {
  const inRaw = row?.checkInTimeDisplay || row?.checkInTime || row?.checkIn || null;
  const inTime = normalizeTime(inRaw);

  const state = getAttendanceState({
    checkInTime: inRaw,
    checkOutTime: row?.checkOutTimeDisplay || row?.checkOutTime || row?.checkOut || null,
  });

  // ไม่ได้เช็คอิน
  if (state === "NOT_IN") {
    // วันนี้: ถ้าเลยเวลาเริ่มงานแล้ว -> ABSENT (หรือจะให้เป็น LATE ก็ได้ แต่คุณใช้ late rule แยกอยู่แล้ว)
    if (isForToday) return "ABSENT";
    return "-";
  }

  // เช็คอินแล้ว -> ON_TIME / LATE
  const late = isLate(state, inTime, isForToday, row);
  return late ? "LATE" : "ON_TIME";
};

export const getOutStatus = (row) => {
  const inRaw = row?.checkInTimeDisplay || row?.checkInTime || row?.checkIn || null;
  const outRaw = row?.checkOutTimeDisplay || row?.checkOutTime || row?.checkOut || null;

  const hasIn = !!inRaw;
  const outTime = normalizeTime(outRaw);

  // ไม่มีเช็คอิน -> ไม่มีสถานะออก
  if (!hasIn) return "-";

  // มีเช็คอินแต่ยังไม่เช็คเอาต์
  if (!outTime) return "NO_CHECKOUT";

  // มีเวลาออกแล้ว -> EARLY / NORMAL เทียบกับเวลางานเลิก
  const endStr =
    String(row?.standardConfig?.end || row?.roleConfig?.end || row?.workConfig?.end || SHIFT_END).slice(0, 5);

  const outM = toMinutes(outTime);
  const endM = toMinutes(endStr);
  if (outM == null || endM == null) return "NORMAL";

  // ออกก่อนเวลาเลิกงาน -> EARLY
  if (outM < endM) return "EARLY";

  return "NORMAL";
};

export const labelByInStatus = (s) => {
  if (s === "ON_TIME") return "ON TIME";
  if (s === "LATE") return "LATE";
  if (s === "ABSENT") return "ABSENT";
  return "-";
};

export const labelByOutStatus = (s) => {
  if (s === "NORMAL") return "NORMAL";
  if (s === "EARLY") return "EARLY";
  if (s === "NO_CHECKOUT") return "NO CHECKOUT";
  return "-";
};

export const badgeByInStatus = (s) => {
  if (s === "ON_TIME") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (s === "LATE") return "bg-rose-50 text-rose-600 border-rose-100";
  if (s === "ABSENT") return "bg-gray-50 text-gray-500 border-gray-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
};

export const badgeByOutStatus = (s) => {
  if (s === "NORMAL") return "bg-indigo-50 text-indigo-700 border-indigo-100";
  if (s === "EARLY") return "bg-amber-50 text-amber-700 border-amber-100";
  if (s === "NO_CHECKOUT") return "bg-rose-50 text-rose-600 border-rose-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
};
// ===============================================================
