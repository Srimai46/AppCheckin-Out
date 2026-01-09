// src/pages/teamCalendar/helpers/leaveSelectors.js
import { format, isSameDay } from "date-fns";
import { normalizeTime, getAttendanceState, isLate } from "../utils";

const normStatus = (s) => String(s || "").toLowerCase();
const roleOf = (leaf) =>
  String(leaf?.employee?.role || leaf?.employee?.position || leaf?.role || leaf?.position || "").toUpperCase();

const nameOf = (leaf) =>
  String(
    leaf?.name ||
      leaf?.employee?.fullName ||
      `${leaf?.employee?.firstName || ""} ${leaf?.employee?.lastName || ""}`.trim() ||
      ""
  ).toLowerCase();

export const countLeavesToday = (leaves, selectedTypes, matchLeaveType) => {
  const today = new Date();
  return (leaves || []).filter((l) => {
    if (!isSameDay(l.date, today)) return false;
    if (!selectedTypes?.length) return true;
    return selectedTypes.some((f) => matchLeaveType(l.type, f));
  }).length;
};

export const leavesByDayAndType = (leaves, day, selectedTypes, matchLeaveType) => {
  const key = format(day, "yyyy-MM-dd");
  return (leaves || []).filter((leaf) => {
    if (leaf.dateKey !== key) return false;
    if (!selectedTypes?.length) return true;
    return selectedTypes.some((f) => matchLeaveType(leaf.type, f));
  });
};

export const splitLeavesByStatus = (rows) => {
  const all = rows || [];
  return {
    pending: all.filter((l) => normStatus(l.status) === "pending"),
    approved: all.filter((l) => normStatus(l.status) === "approved"),
    rejected: all.filter((l) => normStatus(l.status) === "rejected"),
  };
};

export const filterLeaveRows = (rows, roleFilter, search) => {
  const term = String(search || "").trim().toLowerCase();
  const wantRole = roleFilter === "WORKER" ? "WORKER" : roleFilter === "HR" ? "HR" : "ALL";

  return (rows || []).filter((leaf) => {
    const r = roleOf(leaf);
    if (wantRole !== "ALL" && r !== wantRole) return false;
    if (!term) return true;

    const email = String(leaf?.employee?.email || leaf?.email || "").toLowerCase();
    const id = String(leaf?.employeeId ?? leaf?.employee?.id ?? leaf?.id ?? "").toLowerCase();
    const name = nameOf(leaf);

    return name.includes(term) || email.includes(term) || id.includes(term);
  });
};

export const buildOnLeaveIdSet = (approvedLeavesOfDay) => {
  const set = new Set();
  (approvedLeavesOfDay || []).forEach((l) => {
    const id = l.employeeId ?? l.employee?.id ?? null;
    if (id != null) set.add(String(id));
  });
  return set;
};

export const buildModalSummary = (selectedDate, modalAttendance, onLeaveIds) => {
  const isForToday = isSameDay(selectedDate, new Date());
  const rows = (modalAttendance || []).filter((r) => r?.isActive === true || r?.isActive === 1);

  let checkedIn = 0;
  let lateCount = 0;
  let absent = 0;

  rows.forEach((r) => {
    const inRaw = r.checkInTimeDisplay || r.checkInTime || r.checkIn || null;
    const outRaw = r.checkOutTimeDisplay || r.checkOutTime || r.checkOut || null;

    const inTime = normalizeTime(inRaw);
    const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

    if (state === "IN" || state === "OUT") checkedIn += 1;
    if (state === "NOT_IN") absent += 1;
    if (isLate(state, inTime, isForToday, r)) lateCount += 1;
  });

  const onLeave = onLeaveIds?.size || 0;

  // remove "absent but actually on leave"
  if (rows.length && onLeave) {
    let leaveAndAbsent = 0;
    rows.forEach((r) => {
      const id = String(r.employeeId ?? r.id ?? "");
      if (!id || !onLeaveIds.has(id)) return;

      const inRaw = r.checkInTimeDisplay || r.checkInTime || r.checkIn || null;
      const outRaw = r.checkOutTimeDisplay || r.checkOutTime || r.checkOut || null;
      const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

      if (state === "NOT_IN") leaveAndAbsent += 1;
    });
    absent = Math.max(0, absent - leaveAndAbsent);
  }

  return { checkedIn, late: lateCount, absent, onLeave };
};
