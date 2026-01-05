// frontend/src/pages/yearEnd/hooks/useHolidayPolicy.js
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { alertConfirm, alertError, alertSuccess } from "../../../utils/sweetAlert";
import { calcTotalDays, clamp, isValidTime, safeYMD, toYMD } from "../utils";

import {
  buildHolidayDeleteConfirmHtml,
  buildHolidayUpsertConfirmHtml,
  buildMaxConsecutiveConfirmHtml,
  buildWorkingDaysConfirmHtml,
  buildWorkTimeConfirmHtml,
} from "../confirmHtml";

const Ctx = createContext(null);

// ✅ ใช้ host อย่างเดียว แล้วค่อยเติม /api ตอนเรียก
const API_HOST = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

// ✅ token ต้องดึงสด ไม่ค้างค่า
const getToken = () => localStorage.getItem("token");
const getAuthHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

// ✅ helper กัน response เป็น HTML แล้ว res.json() แตก
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // HTML หรือ plain text
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
      console.error("Fetch Working Days Error:", e);
      alertError("Load Failed", e.message || "Unable to load working days policy.");
      setWorkingDays(["MON", "TUE", "WED", "THU", "FRI"]);
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const toggleWorkingDay = (k) => {
    setWorkingDays((prev) => {
      const p = Array.isArray(prev) ? prev : [];
      const kk = String(k || "").toUpperCase();
      return p.includes(kk) ? p.filter((x) => x !== kk) : [...p, kk];
    });
  };

  const saveWorkingDaysPolicy = async () => {
    if (policySaving) return;

    if (!Array.isArray(workingDays) || workingDays.length === 0) {
      alertError("Invalid Working Days", "Please select at least 1 working day.");
      return;
    }

    const ok = await alertConfirm("Save Working Days?", buildWorkingDaysConfirmHtml(workingDays), "Save");
    if (!ok) return;

    setPolicySaving(true);
    try {
      const data = await fetchJson(`${API_HOST}/api/holidays/working-days`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workingDays }),
      });

      const savedDays = Array.isArray(data?.data?.workingDays)
        ? data.data.workingDays
        : Array.isArray(data?.workingDays)
        ? data.workingDays
        : workingDays;

      setWorkingDays(savedDays);
      await alertSuccess("Saved", "Working Days saved.");
    } catch (e) {
      console.error(e);
      alertError("Save Failed", e.message || "Unable to save policy.");
    } finally {
      setPolicySaving(false);
    }
  };

  // =========================================
  // 2. Work Time by Role
  // =========================================
  const [workTimeByRole, setWorkTimeByRole] = useState({
    HR: { start: "09:00", end: "18:00" },
    WORKER: { start: "09:00", end: "18:00" },
  });
  const [workTimeSaving, setWorkTimeSaving] = useState(false);

  const fetchWorkConfigs = useCallback(async () => {
    try {
      const rawToken = getToken();
      if (!rawToken) return;

      const result = await fetchJson(`${API_HOST}/api/attendance/work-config`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "Content-Type": "application/json",
        },
      });

      if (result?.data) {
        const newConfigs = {};
        result.data.forEach((item) => {
          const roleKey = String(item.role || "").toUpperCase();

          newConfigs[roleKey] = {
            start: `${String(item.startHour).padStart(2, "0")}:${String(item.startMin).padStart(2, "0")}`,
            end: `${String(item.endHour).padStart(2, "0")}:${String(item.endMin).padStart(2, "0")}`,
          };
        });

        if (Object.keys(newConfigs).length > 0) {
          setWorkTimeByRole((prev) => ({ ...prev, ...newConfigs }));
        }
      }
    } catch (e) {
      console.error("Fetch Config Error:", e);
    }
  }, []);

  const updateWorkTime = (role, field, value) => {
    setWorkTimeByRole((prev) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [field]: value },
    }));
  };

  const saveWorkTimePolicy = async () => {
    if (workTimeSaving) return;

    const roles = Object.keys(workTimeByRole || {});
    for (const r of roles) {
      const s = workTimeByRole?.[r]?.start;
      const e = workTimeByRole?.[r]?.end;

      if (!isValidTime(s) || !isValidTime(e)) {
        alertError("Invalid Time", `Please set valid time for ${r} (HH:MM).`);
        return;
      }
      if (String(s) >= String(e)) {
        alertError("Invalid Range", `${r} start time must be before end time.`);
        return;
      }
    }

    const ok = await alertConfirm("Save Work Time?", buildWorkTimeConfirmHtml(workTimeByRole), "Save");
    if (!ok) return;

    setWorkTimeSaving(true);
    try {
      const rawToken = getToken();
      if (!rawToken) throw new Error("No token");

      const requests = Object.entries(workTimeByRole).map(([role, time]) => {
        const [startHour, startMin] = time.start.split(":").map(Number);
        const [endHour, endMin] = time.end.split(":").map(Number);

        let dbRole = role;
        if (role === "WORKER") dbRole = "Worker";
        if (role === "HR") dbRole = "HR";

        return fetchJson(`${API_HOST}/api/attendance/work-config`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${rawToken}`,
          },
          body: JSON.stringify({ role: dbRole, startHour, startMin, endHour, endMin }),
        });
      });

      await Promise.all(requests);
      await alertSuccess("Saved", "Work time per role saved to database.");
      fetchWorkConfigs();
    } catch (e) {
      console.error(e);
      alertError("Save Failed", e.message || "Unable to save work time policy.");
    } finally {
      setWorkTimeSaving(false);
    }
  };

  // =========================================
  // 3. Max Consecutive Holidays (✅ ยิง /api/holidays/max-consecutive)
  // =========================================
  const [maxConsecutiveHolidayDays, setMaxConsecutiveHolidayDays] = useState(3);
  const [maxConsecutiveSaving, setMaxConsecutiveSaving] = useState(false);

  const fetchMaxConsecutivePolicy = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_HOST}/api/holidays/max-consecutive`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const v =
        typeof data?.maxConsecutiveHolidayDays === "number"
          ? data.maxConsecutiveHolidayDays
          : 3;

      setMaxConsecutiveHolidayDays(clamp(v, 1, 365));
    } catch (e) {
      console.error("Fetch Max Consecutive Error:", e);
      // ไม่ต้องเด้ง alert ก็ได้ เดี๋ยว page จะ noisy
    }
  }, []);

  const saveMaxConsecutivePolicy = async () => {
    if (maxConsecutiveSaving) return;

    const value = Number(maxConsecutiveHolidayDays);
    if (value < 1 || value > 365) {
      return alertError("Invalid Limit", "Max consecutive days must be between 1 and 365.");
    }

    const ok = await alertConfirm(
      "Save Max Consecutive Holidays?",
      buildMaxConsecutiveConfirmHtml(value),
      "Save"
    );
    if (!ok) return;

    setMaxConsecutiveSaving(true);
    try {
      const data = await fetchJson(`${API_HOST}/api/holidays/max-consecutive`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ days: value }),
      });

      const savedVal =
        typeof data?.data?.maxConsecutiveHolidayDays === "number"
          ? data.data.maxConsecutiveHolidayDays
          : value;

      setMaxConsecutiveHolidayDays(clamp(savedVal, 1, 365));

      await alertSuccess("Saved", `Max consecutive holidays updated to ${savedVal} day(s).`);
    } catch (e) {
      console.error(e);
      alertError("Save Failed", e.message || "Unable to save policy.");
    } finally {
      setMaxConsecutiveSaving(false);
    }
  };

  // =========================================
  // 4. Special Holidays
  // =========================================
  const [specialHolidays, setSpecialHolidays] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [holidayName, setHolidayName] = useState("");
  const [holidayStart, setHolidayStart] = useState("");
  const [holidayEnd, setHolidayEnd] = useState("");

  const fetchSpecialHolidays = useCallback(async () => {
    try {
      const year = new Date().getFullYear();

      const data = await fetchJson(`${API_HOST}/api/holidays?year=${year}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (Array.isArray(data)) {
        setSpecialHolidays(
          data.map((h) => ({
            id: h.id,
            startDate: h.date,
            endDate: h.date,
            name: h.name,
            isSubsidy: h.isSubsidy,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const resetHolidayForm = () => {
    setEditId(null);
    setHolidayName("");
    setHolidayStart("");
    setHolidayEnd("");
  };

  const openAddForm = () => {
    setFormOpen(true);
    resetHolidayForm();
    const today = toYMD(new Date());
    setHolidayStart(today);
    setHolidayEnd(today);
  };

  const onEditHoliday = (row) => {
    setFormOpen(true);
    setEditId(row.id);
    setHolidayName(row.name || "");
    setHolidayStart(safeYMD(row.startDate));
    setHolidayEnd(safeYMD(row.endDate));
  };

  const upsertSpecialHoliday = async () => {
    const name = holidayName.trim();
    const start = safeYMD(holidayStart);
    const end = safeYMD(holidayEnd);

    if (!name) return alertError("Missing Name", "Please enter holiday name.");
    if (!start || !end) return alertError("Missing Date", "Please select date.");
    if (start > end) return alertError("Invalid Range");

    const total = calcTotalDays(start, end);

    const ok = await alertConfirm(
      editId ? "Confirm Update?" : "Confirm Add?",
      buildHolidayUpsertConfirmHtml({
        name,
        start,
        end,
        total,
        mode: editId ? "Update" : "Add",
      }),
      editId ? "Update" : "Add"
    );
    if (!ok) return;

    try {
      if (editId) {
        await fetchJson(`${API_HOST}/api/holidays/${editId}`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, date: start }),
        });
        await alertSuccess("Updated", "Holiday updated.");
      } else {
        const holidays = [];
        let d = new Date(start);
        const last = new Date(end);

        while (d <= last) {
          holidays.push({
            date: toYMD(d),
            name,
            isSubsidy: false,
          });
          d.setDate(d.getDate() + 1);
        }

        await fetchJson(`${API_HOST}/api/holidays`, {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ holidays }),
        });

        await alertSuccess("Added", "Holidays added.");
      }

      fetchSpecialHolidays();
      setFormOpen(false);
      resetHolidayForm();
    } catch (e) {
      alertError("Error", e.message);
    }
  };

  const onDeleteHoliday = async (row) => {
    const start = safeYMD(row.startDate);
    const total = calcTotalDays(start, safeYMD(row.endDate));

    const ok = await alertConfirm(
      "Delete this holiday?",
      buildHolidayDeleteConfirmHtml({
        name: row.name,
        start,
        end: row.endDate,
        total,
      }),
      "Delete"
    );
    if (!ok) return;

    try {
      await fetchJson(`${API_HOST}/api/holidays/${row.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      await alertSuccess("Deleted", "Holiday removed.");
      fetchSpecialHolidays();
    } catch (e) {
      alertError("Error", e.message);
    }
  };

  const sortedSpecialHolidays = useMemo(
    () => [...specialHolidays].sort((a, b) => safeYMD(a.startDate).localeCompare(safeYMD(b.startDate))),
    [specialHolidays]
  );

  // ✅ โหลดครั้งแรก
  useEffect(() => {
    fetchWorkingDaysPolicy();
    fetchWorkConfigs();
    fetchMaxConsecutivePolicy();
    fetchSpecialHolidays();
  }, [fetchWorkingDaysPolicy, fetchWorkConfigs, fetchMaxConsecutivePolicy, fetchSpecialHolidays]);

  const value = {
    workingDays,
    toggleWorkingDay,
    policySaving,
    policyLoading,
    saveWorkingDaysPolicy,

    workTimeByRole,
    updateWorkTime,
    workTimeSaving,
    saveWorkTimePolicy,

    maxConsecutiveHolidayDays,
    setMaxConsecutiveHolidayDays: (v) => setMaxConsecutiveHolidayDays(clamp(Number(v || 1), 1, 365)),
    maxConsecutiveSaving,
    saveMaxConsecutivePolicy,

    specialHolidays,
    sortedSpecialHolidays,
    formOpen,
    setFormOpen,
    editId,
    holidayName,
    setHolidayName,
    holidayStart,
    setHolidayStart,
    holidayEnd,
    setHolidayEnd,
    openAddForm,
    resetHolidayForm,
    onEditHoliday,
    onDeleteHoliday,
    upsertSpecialHoliday,
  };

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useHolidayPolicy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHolidayPolicy must be used within HolidayPolicyProvider");
  return ctx;
}
