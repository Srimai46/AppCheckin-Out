import { useCallback, useEffect, useMemo, useState } from "react";
import { PAGE_SIZE } from "../constants";
// import { normalizeTime, getAttendanceState, isLate } from "../utils"; // ❌ ไม่ต้อง import isLate แล้ว
import {
  getTodayTeamAttendance,
  hrCheckInEmployee,
  hrCheckOutEmployee,
} from "../../../api/attendanceService";

import { alertConfirm, alertSuccess, alertError } from "../../../utils/sweetAlert";

export default function useTeamAttendanceToday() {
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [attLoading, setAttLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); 

  const [roleFilter, setRoleFilter] = useState("ALL"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [teamPage, setTeamPage] = useState(1);

  const fetchTeamAttendance = useCallback(async () => {
    try {
      setAttLoading(true);

      const res = await getTodayTeamAttendance();
      // Logic การแกะ response เพื่อรองรับหลาย format
      const list =
        (Array.isArray(res) && res) ||
        (Array.isArray(res?.data) && res.data) ||
        (Array.isArray(res?.data?.data) && res.data.data) ||
        (Array.isArray(res?.employees) && res.employees) ||
        (Array.isArray(res?.data?.employees) && res.data.employees) ||
        [];

      setTeamAttendance(list);
      setTeamPage(1);
    } catch (e) {
      console.error("useTeamAttendanceToday: fetch error", e);
      setTeamAttendance([]);
    } finally {
      setAttLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamAttendance();
  }, [fetchTeamAttendance]);

  // active employees only
  const activeTeamAttendance = useMemo(() => {
    return (teamAttendance || []).filter((r) => r?.isActive === true || r?.isActive === 1);
  }, [teamAttendance]);

  // role + search filter
  const filteredTeamAttendance = useMemo(() => {
    const term = String(searchTerm || "").trim().toLowerCase();

    return (activeTeamAttendance || []).filter((row) => {
      // Role Filter
      const roleRaw = String(row?.role || row?.position || "").toUpperCase();
      if (roleFilter !== "ALL") {
        const want = roleFilter === "WORKER" ? "WORKER" : "HR";
        if (roleRaw !== want) return false;
      }

      // Search Filter
      if (!term) return true;

      const id = String(row?.employeeId ?? row?.id ?? "").toLowerCase();
      const email = String(row?.email ?? "").toLowerCase();
      const name = String(
        row?.fullName ||
          row?.name ||
          `${row?.firstName || ""} ${row?.lastName || ""}`.trim()
      ).toLowerCase();

      return name.includes(term) || email.includes(term) || id.includes(term);
    });
  }, [activeTeamAttendance, roleFilter, searchTerm]);

  // Pagination
  const totalTeamPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredTeamAttendance.length / PAGE_SIZE));
  }, [filteredTeamAttendance.length]);

  const pagedTeamAttendance = useMemo(() => {
    const start = (teamPage - 1) * PAGE_SIZE;
    return filteredTeamAttendance.slice(start, start + PAGE_SIZE);
  }, [filteredTeamAttendance, teamPage]);

  useEffect(() => {
    setTeamPage((p) => Math.min(Math.max(1, p), totalTeamPages));
  }, [totalTeamPages]);

  useEffect(() => setTeamPage(1), [roleFilter, searchTerm]);

  // --- 🔥 จุดที่แก้: Summary Calculation ---
  const attendanceSummary = useMemo(() => {
    const total = activeTeamAttendance.length;

    let checkedIn = 0;
    let late = 0;
    let checkedOut = 0;

    activeTeamAttendance.forEach((r) => {
      // เช็คว่ามีการ Check-in หรือยัง (ดูจาก field ที่ API ส่งมา)
      const hasCheckIn = !!(r.checkInTimeDisplay || r.checkInTime);
      const hasCheckOut = !!(r.checkOutTimeDisplay || r.checkOutTime);

      if (hasCheckIn) {
        // นับจำนวนคนเข้างาน (Working + Completed)
        checkedIn += 1; 

        // ✅ ใช้ค่า inStatus ที่ Backend ส่งมาตรงๆ (แม่นยำกว่าคำนวณใหม่)
        if (r.inStatus === "Late") {
            late += 1;
        }
      }

      if (hasCheckOut) {
        checkedOut += 1;
      }
    });

    return { total, checkedIn, late, checkedOut };
  }, [activeTeamAttendance]);


  // Actions (HR Check-in/out) เหมือนเดิม
  const handleHRCheckIn = useCallback(
    async (employeeId, employeeName = "") => {
      const busy = actionLoading[employeeId];
      if (busy) return;

      const ok = await alertConfirm(
        "Confirm Check-in",
        employeeName
          ? `Do you want to check in for ${employeeName}?`
          : "Do you want to check in for this employee?"
      );
      if (!ok) return;

      try {
        setActionLoading((p) => ({ ...p, [employeeId]: "in" }));
        await hrCheckInEmployee(employeeId);
        await alertSuccess("Attendance Recorded", "Check-in saved successfully.");
        await fetchTeamAttendance();
      } catch (e) {
        console.error("HR check-in failed:", e);
        alertError("Operation Failed", e?.response?.data?.message || "Unable to check in employee.");
      } finally {
        setActionLoading((p) => ({ ...p, [employeeId]: null }));
      }
    },
    [actionLoading, fetchTeamAttendance]
  );

  const handleHRCheckOut = useCallback(
    async (employeeId, employeeName = "") => {
      const busy = actionLoading[employeeId];
      if (busy) return;

      const ok = await alertConfirm(
        "Confirm Check-out",
        employeeName
          ? `Do you want to check out for ${employeeName}?`
          : "Do you want to check out for this employee?"
      );
      if (!ok) return;

      try {
        setActionLoading((p) => ({ ...p, [employeeId]: "out" }));
        await hrCheckOutEmployee(employeeId);
        await alertSuccess("Attendance Recorded", "Check-out saved successfully.");
        await fetchTeamAttendance();
      } catch (e) {
        console.error("HR check-out failed:", e);
        alertError("Operation Failed", e?.response?.data?.message || "Unable to check out employee.");
      } finally {
        setActionLoading((p) => ({ ...p, [employeeId]: null }));
      }
    },
    [actionLoading, fetchTeamAttendance]
  );

  return {
    attLoading,
    actionLoading,
    activeTeamAttendance,
    roleFilter,
    setRoleFilter,
    searchTerm,
    setSearchTerm,
    teamPage,
    setTeamPage,
    totalTeamPages,
    filteredTeamAttendance,
    pagedTeamAttendance,
    attendanceSummary, 
    fetchTeamAttendance,
    handleHRCheckIn,
    handleHRCheckOut,
  };
}