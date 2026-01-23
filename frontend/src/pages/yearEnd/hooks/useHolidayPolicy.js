import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import {
  alertConfirm,
  alertError,
  alertSuccess,
} from "../../../utils/sweetAlert";
import { calcTotalDays, clamp, isValidTime, safeYMD, toYMD } from "../utils";

import {
  buildHolidayDeleteConfirmHtml,
  buildHolidayUpsertConfirmHtml,
  buildMaxConsecutiveConfirmHtml,
  buildWorkingDaysConfirmHtml,
  buildWorkTimeConfirmHtml,
} from "../confirmHtml";

const Ctx = createContext(null);

// ============================
// helpers
// ============================
const hasAtLeastOneName = (nameObj) =>
  Object.values(nameObj || {}).some(
    (v) => typeof v === "string" && v.trim() !== ""
  );

// ============================
// API helpers
// ============================
const API_HOST = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(
  /\/$/,
  ""
);
const getToken = () => localStorage.getItem("token");
const getAuthHeaders = () => ({ 
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json"
});

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      (typeof data?.raw === "string" ? data.raw : "") ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
};

export function HolidayPolicyProvider({ children }) {
  const { t } = useTranslation();

  // =========================================
  // 1. Working Days
  // =========================================
  const [workingDays, setWorkingDays] = useState(["MON", "TUE", "WED", "THU", "FRI"]);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);

  const fetchWorkingDaysPolicy = useCallback(async () => {
    try {
      setPolicyLoading(true);
      const data = await fetchJson(`${API_HOST}/api/holidays/working-days`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const arr = Array.isArray(data?.workingDays) ? data.workingDays : ["MON", "TUE", "WED", "THU", "FRI"];
      setWorkingDays(arr);
    } catch (e) {
      console.error(e);
      setWorkingDays(["MON", "TUE", "WED", "THU", "FRI"]);
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const toggleWorkingDay = (k) => {
    setWorkingDays((prev) => {
      const kk = String(k || "").toUpperCase();
      return prev.includes(kk) ? prev.filter((x) => x !== kk) : [...prev, kk];
    });
  };

  const saveWorkingDaysPolicy = async () => {
    if (policySaving) return;
    if (!workingDays.length) return alertError(t("holidayPolicy.errors.invalidTitle"), t("holidayPolicy.errors.selectAtLeastOneDay"));

    const ok = await alertConfirm(t("workingDays.confirmTitle"), buildWorkingDaysConfirmHtml(workingDays), t("common.save"));
    if (!ok) return;

    setPolicySaving(true);
    try {
      await fetchJson(`${API_HOST}/api/holidays/working-days`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ workingDays }),
      });
      await alertSuccess(t("holidayPolicy.success.savedTitle"), t("workingDays.savedText"));
    } catch (e) {
      alertError(t("holidayPolicy.errors.saveFailedTitle"), e.message);
    } finally {
      setPolicySaving(false);
    }
  };

  // =========================================
  // 2. Work Time & Departments (Fixed for Dept only)
  // =========================================
  const [departments, setDepartments] = useState([]);
  const [workTimeByRole, setWorkTimeByRole] = useState({});
  const [workTimeSaving, setWorkTimeSaving] = useState(false);

  // 2.1 Fetch Departments List
  const fetchDepartments = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_HOST}/api/departments`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      setDepartments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fetch Dept Error:", e);
    }
  }, []);

  // 2.2 Fetch Work Configs (Filter only Departments)
  const fetchWorkConfigs = useCallback(async () => {
    try {
      const result = await fetchJson(`${API_HOST}/api/attendance/work-config`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (Array.isArray(result?.data)) {
        const map = {};
        result.data.forEach((i) => {
          // Only map if departmentId exists (ignore Roles)
          if (i.departmentId) {
            map[String(i.departmentId)] = {
              start: `${String(i.startHour).padStart(2, "0")}:${String(i.startMin).padStart(2, "0")}`,
              end: `${String(i.endHour).padStart(2, "0")}:${String(i.endMin).padStart(2, "0")}`,
              breakStart: `${String(i.breakStartHour ?? 12).padStart(2, "0")}:${String(i.breakStartMin ?? 0).padStart(2, "0")}`,
              breakEnd: `${String(i.breakEndHour ?? 13).padStart(2, "0")}:${String(i.breakEndMin ?? 0).padStart(2, "0")}`,
            };
          }
        });
        setWorkTimeByRole(map);
      }
    } catch (e) {
      console.error("Fetch Config Error:", e);
    }
  }, []);

  const updateWorkTime = (id, field, value) => {
    setWorkTimeByRole((prev) => ({
      ...prev,
      [id]: { 
        ...(prev[id] || { start: "09:00", end: "18:00", breakStart: "12:00", breakEnd: "13:00" }), 
        [field]: value 
      },
    }));
  };

  // 2.3 Save Logic (Fixed Error 400)
  const saveWorkTimePolicy = async (targetId = null) => {
    if (workTimeSaving) return;

    // Filter logic: Only save numeric keys (Department IDs)
    // If targetId is provided, save ONLY that one.
    const entries = Object.entries(workTimeByRole).filter(([key]) => {
      if (targetId) return key === String(targetId);
      return !isNaN(key) && key !== "ALL"; 
    });

    if (entries.length === 0) {
      return alertError("Error", "กรุณาเลือกแผนกที่ต้องการบันทึก");
    }

    const ok = await alertConfirm(
      t("workTimeByRole.confirmTitle"),
      "ยืนยันการบันทึกการตั้งค่าเวลา (Save Changes)?",
      t("common.save")
    );
    if (!ok) return;

    setWorkTimeSaving(true);
    try {
      await Promise.all(
        entries.map(([deptId, tt]) => {
          const [sh, sm] = (tt.start || "09:00").split(":").map(Number);
          const [eh, em] = (tt.end || "18:00").split(":").map(Number);
          const [bsh, bsm] = (tt.breakStart || "12:00").split(":").map(Number);
          const [beh, bem] = (tt.breakEnd || "13:00").split(":").map(Number);

          return fetchJson(`${API_HOST}/api/attendance/work-config`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              departmentId: parseInt(deptId, 10), // Ensure Integer
              role: null, // Force null to avoid conflict
              startHour: sh, startMin: sm,
              endHour: eh, endMin: em,
              breakStartHour: bsh, breakStartMin: bsm,
              breakEndHour: beh, breakEndMin: bem,
            }),
          });
        })
      );

      await alertSuccess(t("holidayPolicy.success.savedTitle"), t("workTimeByRole.savedText"));
      fetchWorkConfigs();
    } catch (e) {
      alertError(t("holidayPolicy.errors.saveFailedTitle"), e.message);
    } finally {
      setWorkTimeSaving(false);
    }
  };

  // =========================================
  // 3. Max Consecutive Holidays
  // =========================================
  const [maxConsecutiveHolidayDays, setMaxConsecutiveHolidayDays] = useState(3);
  const [maxConsecutiveSaving, setMaxConsecutiveSaving] = useState(false);

  const fetchMaxConsecutivePolicy = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_HOST}/api/holidays/max-consecutive`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      setMaxConsecutiveHolidayDays(clamp(Number(data?.maxConsecutiveHolidayDays || 3), 1, 365));
    } catch { false; }
  }, []);

  const saveMaxConsecutivePolicy = async () => {
    if (maxConsecutiveSaving) return;
    const v = Number(maxConsecutiveHolidayDays);
    const ok = await alertConfirm(t("maxConsecutive.confirmTitle"), buildMaxConsecutiveConfirmHtml(v), t("common.save"));
    if (!ok) return;
    setMaxConsecutiveSaving(true);
    try {
      await fetchJson(`${API_HOST}/api/holidays/max-consecutive`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ days: v }),
      });
      await alertSuccess(t("holidayPolicy.success.savedTitle"), t("maxConsecutive.savedText"));
    } catch (e) {
      alertError(t("holidayPolicy.errors.saveFailedTitle"), e.message);
    } finally { setMaxConsecutiveSaving(false); }
  };

  // =========================================
  // 4. Special Holidays
  // =========================================
  const [specialHolidays, setSpecialHolidays] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [holidayName, setHolidayName] = useState({});
  const [holidayStart, setHolidayStart] = useState("");
  const [holidayEnd, setHolidayEnd] = useState("");

  const fetchSpecialHolidays = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_HOST}/api/holidays?year=${new Date().getFullYear()}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (Array.isArray(data)) {
        setSpecialHolidays(data.map((h) => ({
          id: h.id, startDate: h.date, endDate: h.date,
          name: typeof h.name === "string" ? { th: h.name } : h.name,
        })));
      }
    } catch (e) { console.error(e); }
  }, []);

  const resetHolidayForm = () => { setEditId(null); setHolidayName({}); setHolidayStart(""); setHolidayEnd(""); };

  const openAddForm = () => {
    resetHolidayForm(); setFormOpen(true);
    const today = toYMD(new Date()); setHolidayStart(today); setHolidayEnd(today);
  };

  const onEditHoliday = (row) => {
    setFormOpen(true); setEditId(row.id);
    setHolidayName(typeof row.name === "string" ? { th: row.name } : row.name || {});
    setHolidayStart(safeYMD(row.startDate)); setHolidayEnd(safeYMD(row.endDate));
  };

  const upsertSpecialHoliday = async () => {
    const start = safeYMD(holidayStart);
    const end = safeYMD(holidayEnd);

    if (!hasAtLeastOneName(holidayName)) return alertError(t("holidayPolicy.errors.missingNameTitle"));
    if (!start || !end) return alertError(t("holidayPolicy.errors.missingDateTitle"));

    const total = calcTotalDays(start, end);
    const ok = await alertConfirm(
        editId ? "Update Holiday?" : "Add Holiday?", 
        buildHolidayUpsertConfirmHtml({ name: holidayName, start, end, total }),
        t("common.save")
    );
    if (!ok) return;

    try {
      if (editId) {
        await fetchJson(`${API_HOST}/api/holidays/${editId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: holidayName, date: start }),
        });
      } else {
        // Simple Add logic loop
        const holidays = []; let d = new Date(start); const last = new Date(end);
        while (d <= last) {
           holidays.push({ date: toYMD(d), name: holidayName, isSubsidy: false });
           d.setDate(d.getDate() + 1);
        }
        await fetchJson(`${API_HOST}/api/holidays`, {
           method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ holidays })
        });
      }
      await alertSuccess("Success", "Holiday saved.");
      fetchSpecialHolidays(); setFormOpen(false); resetHolidayForm();
    } catch (e) { alertError("Error", e.message); }
  };

  const onDeleteHoliday = async (row) => {
      const ok = await alertConfirm("Delete?", "Are you sure?", "Delete");
      if(!ok) return;
      try {
          await fetchJson(`${API_HOST}/api/holidays/${row.id}`, { method: "DELETE", headers: getAuthHeaders() });
          await alertSuccess("Deleted", "Holiday deleted.");
          fetchSpecialHolidays();
      } catch(e) { alertError("Error", e.message); }
  };

  const sortedSpecialHolidays = useMemo(
    () => [...specialHolidays].sort((a, b) => safeYMD(a.startDate).localeCompare(safeYMD(b.startDate))),
    [specialHolidays]
  );

  useEffect(() => {
    fetchWorkingDaysPolicy();
    fetchDepartments(); // Load departments
    fetchWorkConfigs();
    fetchMaxConsecutivePolicy();
    fetchSpecialHolidays();
  }, [fetchWorkingDaysPolicy, fetchDepartments, fetchWorkConfigs, fetchMaxConsecutivePolicy, fetchSpecialHolidays]);

  const value = {
    workingDays, toggleWorkingDay, policySaving, policyLoading, saveWorkingDaysPolicy,
    // Updated exports for Departments
    departments, workTimeByRole, updateWorkTime, workTimeSaving, saveWorkTimePolicy,
    maxConsecutiveHolidayDays, setMaxConsecutiveHolidayDays, maxConsecutiveSaving, saveMaxConsecutivePolicy,
    specialHolidays, sortedSpecialHolidays, formOpen, setFormOpen, editId,
    holidayName, setHolidayName, holidayStart, setHolidayStart, holidayEnd, setHolidayEnd,
    openAddForm, resetHolidayForm, onEditHoliday, onDeleteHoliday, upsertSpecialHoliday,
  };

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useHolidayPolicy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHolidayPolicy must be used within HolidayPolicyProvider");
  return ctx;
}