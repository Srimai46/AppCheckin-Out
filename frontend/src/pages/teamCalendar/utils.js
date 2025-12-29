import { format } from "date-fns";
import { SHIFT_START } from "./constants";

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

// late rule:
// - NOT_IN = late only for today (now > SHIFT_START)
// - IN/OUT = late if check-in time > SHIFT_START
export const isLate = (state, inTime, isForToday = true) => {
  const startM = toMinutes(SHIFT_START);
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

// weekend bg
export const weekendBgByDow = (dow) => {
  if (dow === 6) return "bg-violet-50/70"; // Saturday
  if (dow === 0) return "bg-rose-50/70"; // Sunday
  return "";
};

// --------------------- Modal helpers ---------------------
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
