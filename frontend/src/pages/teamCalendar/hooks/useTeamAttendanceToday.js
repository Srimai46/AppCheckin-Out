import { useCallback, useEffect, useMemo, useState } from "react";
import { PAGE_SIZE } from "../constants";
import api from "../../../api/axios";

import {
  getTodayTeamAttendance,
  hrCheckInEmployee,
  hrCheckOutEmployee,
} from "../../../api/attendanceService";

import { alertConfirm, alertSuccess, alertError } from "../../../utils/sweetAlert";

/* =========================
   helper: รองรับ response หลายรูปแบบ
   - axios: res.data
   - { data: [...] }
   - { message, data: [...] }
   - { data: { data: [...] } }
   ========================= */
const pickArray = (resLike) => {
  if (!resLike) return [];

  // ถ้าส่งมาเป็น array ตรง ๆ
  if (Array.isArray(resLike)) return resLike;

  // axios response
  const d = resLike?.data ?? resLike;

  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.employees)) return d.employees;
  if (Array.isArray(d?.data?.employees)) return d.data.employees;

  return [];
};

export default function useTeamAttendanceToday() {
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [attLoading, setAttLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // filters
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [teamPage, setTeamPage] = useState(1);

  // dropdown options from DB
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  // =========================
  // Load departments & roles from DB
  // =========================
  const fetchOptions = useCallback(async () => {
    try {
      const [deptRes, roleRes] = await Promise.allSettled([
        api.get("/departments", { params: { simple: 1 } }),
        api.get("/roles", { params: { simple: 1 } }),
      ]);

      // departments
      if (deptRes.status === "fulfilled") {
        const list = pickArray(deptRes.value);
        setDepartments(list);
      } else {
        console.error("fetch departments failed:", deptRes.reason);
        setDepartments([]);
      }

      // roles
      if (roleRes.status === "fulfilled") {
        const list = pickArray(roleRes.value);
        setRoles(list);
      } else {
        console.error("fetch roles failed:", roleRes.reason);
        setRoles([]);
      }
    } catch (e) {
      console.error("useTeamAttendanceToday: fetchOptions error", e);
      setDepartments([]);
      setRoles([]);
    }
  }, []);

  // โหลด options ครั้งเดียวตอนเข้า
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // =========================
  // Fetch attendance
  // =========================
  const fetchTeamAttendance = useCallback(async () => {
    try {
      setAttLoading(true);

      const res = await getTodayTeamAttendance();
      const list = pickArray(res);

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
    return (teamAttendance || []).filter(
      (r) => r?.isActive === true || r?.isActive === 1
    );
  }, [teamAttendance]);

  // reset page when filters/search change
  useEffect(() => {
    setTeamPage(1);
  }, [roleFilter, deptFilter, searchTerm]);

  // =========================
  // Filter: role + department + search
  // =========================
  const filteredTeamAttendance = useMemo(() => {
    const term = String(searchTerm || "").trim().toLowerCase();

    return (activeTeamAttendance || []).filter((row) => {
      // Role Filter (DB-based)
      if (roleFilter !== "ALL") {
        const rowRoleId = row?.roleId ?? row?.role?.id ?? null;
        const rowRoleName =
          row?.roleName ?? row?.role?.name ?? row?.role ?? row?.position ?? "";

        const matchById =
          rowRoleId != null && String(rowRoleId) === String(roleFilter);
        const matchByName = String(rowRoleName) === String(roleFilter);

        const roleRawUpper = String(rowRoleName || "").toUpperCase();
        const wantUpper = String(roleFilter || "").toUpperCase();
        const matchByEnum = roleRawUpper === wantUpper;

        if (!matchById && !matchByName && !matchByEnum) return false;
      }

      // Department Filter (DB-based)
      if (deptFilter !== "ALL") {
        const rowDeptId = row?.departmentId ?? row?.department?.id ?? null;
        const rowDeptName =
          row?.departmentName ??
          row?.department?.name ??
          row?.department ??
          row?.deptName ??
          "";

        const matchById =
          rowDeptId != null && String(rowDeptId) === String(deptFilter);
        const matchByName = String(rowDeptName) === String(deptFilter);

        if (!matchById && !matchByName) return false;
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

      const dept = String(
        row?.departmentName ??
          row?.department?.name ??
          row?.department ??
          row?.deptName ??
          ""
      ).toLowerCase();

      const role = String(
        row?.roleName ?? row?.role?.name ?? row?.role ?? row?.position ?? ""
      ).toLowerCase();

      return (
        name.includes(term) ||
        email.includes(term) ||
        id.includes(term) ||
        dept.includes(term) ||
        role.includes(term)
      );
    });
  }, [activeTeamAttendance, roleFilter, deptFilter, searchTerm]);

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

  // Summary Calculation
  const attendanceSummary = useMemo(() => {
    const total = activeTeamAttendance.length;

    let checkedIn = 0;
    let late = 0;
    let checkedOut = 0;

    activeTeamAttendance.forEach((r) => {
      const hasCheckIn = !!(r.checkInTimeDisplay || r.checkInTime);
      const hasCheckOut = !!(r.checkOutTimeDisplay || r.checkOutTime);

      if (hasCheckIn) {
        checkedIn += 1;
        if (r.inStatus === "Late") late += 1;
      }

      if (hasCheckOut) checkedOut += 1;
    });

    return { total, checkedIn, late, checkedOut };
  }, [activeTeamAttendance]);

  // Actions
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
        alertError(
          "Operation Failed",
          e?.response?.data?.message || "Unable to check in employee."
        );
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
        alertError(
          "Operation Failed",
          e?.response?.data?.message || "Unable to check out employee."
        );
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
    filteredTeamAttendance,
    pagedTeamAttendance,

    roleFilter,
    setRoleFilter,
    roles,

    deptFilter,
    setDeptFilter,
    departments,

    searchTerm,
    setSearchTerm,

    teamPage,
    setTeamPage,
    totalTeamPages,

    attendanceSummary,
    fetchTeamAttendance,
    fetchOptions,
    handleHRCheckIn,
    handleHRCheckOut,
  };
}
