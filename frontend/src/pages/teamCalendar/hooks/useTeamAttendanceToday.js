import { useCallback, useEffect, useMemo, useState } from "react";
import { isSameDay } from "date-fns";
import { PAGE_SIZE } from "../constants";
import {
  normalizeTime,
  getAttendanceState,
  isLate,
} from "../utils";

import {
  getTodayTeamAttendance,
  hrCheckInEmployee,
  hrCheckOutEmployee,
} from "../../../api/attendanceService";

import { alertConfirm, alertSuccess, alertError } from "../../../utils/sweetAlert";

/**
 * useTeamAttendanceToday
 * - fetch today attendance
 * - active filter
 * - role/search filters
 * - pagination
 * - summary
 * - HR actions checkin/checkout
 */
export default function useTeamAttendanceToday() {
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [attLoading, setAttLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // { [employeeId]: "in" | "out" | null }

  const [roleFilter, setRoleFilter] = useState("ALL"); // ALL | HR | WORKER
  const [searchTerm, setSearchTerm] = useState("");
  const [teamPage, setTeamPage] = useState(1);

  const fetchTeamAttendance = useCallback(async () => {
    try {
      setAttLoading(true);

      const res = await getTodayTeamAttendance();
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
      const roleRaw = String(row?.role || row?.position || "").toUpperCase();
      if (roleFilter !== "ALL") {
        const want = roleFilter === "WORKER" ? "WORKER" : "HR";
        if (roleRaw !== want) return false;
      }

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

  // summary
  const attendanceSummary = useMemo(() => {
    const total = activeTeamAttendance.length;

    let checkedIn = 0;
    let late = 0;
    let checkedOut = 0;

    activeTeamAttendance.forEach((r) => {
      const inRaw = r.checkInTimeDisplay || r.checkInTime || r.checkIn || null;
      const outRaw = r.checkOutTimeDisplay || r.checkOutTime || r.checkOut || null;

      const inTime = normalizeTime(inRaw);
      const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

      if (state === "IN") checkedIn += 1;
      if (state === "OUT") checkedOut += 1;

      if (isLate(state, inTime, true)) late += 1;
    });

    return { total, checkedIn, late, checkedOut };
  }, [activeTeamAttendance]);

  // actions
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
    // data
    attLoading,
    actionLoading,
    activeTeamAttendance,

    // filters + paging
    roleFilter,
    setRoleFilter,
    searchTerm,
    setSearchTerm,
    teamPage,
    setTeamPage,
    totalTeamPages,
    filteredTeamAttendance,
    pagedTeamAttendance,

    // summary
    attendanceSummary,

    // api
    fetchTeamAttendance,

    // actions
    handleHRCheckIn,
    handleHRCheckOut,
  };
}
