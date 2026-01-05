//frontend/src/pages/yearEnd/hooks/useHolidayPolicy.js
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { alertConfirm, alertError, alertSuccess } from "../../../utils/sweetAlert";
import { calcTotalDays, clamp, isValidTime, safeYMD, toYMD } from "../utils";
import { updateSystemConfig } from "../../../api/leaveService";

import {
  buildHolidayDeleteConfirmHtml,
  buildHolidayUpsertConfirmHtml,
  buildMaxConsecutiveConfirmHtml,
  buildWorkingDaysConfirmHtml,
  buildWorkTimeConfirmHtml,
} from "../confirmHtml";

const Ctx = createContext(null);
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/$/, "");
const token = localStorage.getItem("token");

export function HolidayPolicyProvider({ children }) {
  // =========================================
  // 1. Working Days (Connected to Backend)
  // =========================================
  const [workingDays, setWorkingDays] = useState(["MON", "TUE", "WED", "THU", "FRI"]);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);

  // ✅ อย่าเก็บ token ไว้นอก component (มันค้างค่า)
  const getToken = () => localStorage.getItem("token");
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // ✅ โหลด Working Days จาก Backend
  const fetchWorkingDaysPolicy = useCallback(async () => {
    try {
      setPolicyLoading(true);
      const res = await fetch(`${API_BASE}/holidays/working-days`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch working days policy");

      const arr = Array.isArray(data?.workingDays) ? data.workingDays : ["MON", "TUE", "WED", "THU", "FRI"];
      setWorkingDays(arr);
    } catch (e) {
      console.error("Fetch Working Days Error:", e);
      alertError("Load Failed", e.message || "Unable to load working days policy.");
      // fallback ค่าเดิม
      setWorkingDays(["MON", "TUE", "WED", "THU", "FRI"]);
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  // ✅ โหลดครั้งแรกตอนเข้า page
  useEffect(() => {
    fetchWorkingDaysPolicy();
  }, [fetchWorkingDaysPolicy]);

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
      const res = await fetch(`${API_BASE}/holidays/working-days`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workingDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");

      // backend ส่งกลับ { message, data } หรือ { key, workingDays } ได้
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
  // 2. Work Time by Role (Connected to DB)
  // =========================================
  const [workTimeByRole, setWorkTimeByRole] = useState({
    HR: { start: "09:00", end: "18:00" },
    WORKER: { start: "09:00", end: "18:00" },
  });
  const [workTimeSaving, setWorkTimeSaving] = useState(false);

  // ✅ 2.1 ฟังก์ชันดึงข้อมูลจาก Database (GET)
  const fetchWorkConfigs = useCallback(async () => {
    try {
      // ✅ ดึง token สดจาก localStorage กันปัญหา state ยังไม่ทัน
      const rawToken = token || localStorage.getItem("token");

      if (!rawToken) {
        console.warn("[fetchWorkConfigs] No token found -> redirect/login?");
        return;
      }

      const res = await fetch(`${API_BASE}/attendance/work-config`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "Content-Type": "application/json",
        },
      });

      // ✅ ถ้า 401/403 จะได้เห็นข้อความจาก backend
      const text = await res.text();
      let result = null;
      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        result = { message: text };
      }

      if (!res.ok) {
        console.error(
          "[fetchWorkConfigs] HTTP Error:",
          res.status,
          result?.message || result
        );

        // ✅ ถ้า token หมดอายุ/ไม่ถูกต้อง
        if (res.status === 401) {
          // ทางเลือก: เคลียร์ token แล้วเด้งไป login
          // localStorage.removeItem("token");
          // window.location.href = "/login";
        }
        return;
      }

      if (result?.data) {
        const newConfigs = {};
        result.data.forEach((item) => {
          const roleKey = String(item.role || "").toUpperCase();

          newConfigs[roleKey] = {
            start: `${String(item.startHour).padStart(2, "0")}:${String(
              item.startMin
            ).padStart(2, "0")}`,
            end: `${String(item.endHour).padStart(2, "0")}:${String(
              item.endMin
            ).padStart(2, "0")}`,
          };
        });

        if (Object.keys(newConfigs).length > 0) {
          setWorkTimeByRole((prev) => ({ ...prev, ...newConfigs }));
        }
      }
    } catch (e) {
      console.error("Fetch Config Error:", e);
    }
  }, [API_BASE, token, setWorkTimeByRole]);

  // ✅ 2.2 โหลดข้อมูลเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetchWorkConfigs();
  }, [fetchWorkConfigs]);

  const updateWorkTime = (role, field, value) => {
    setWorkTimeByRole((prev) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [field]: value },
    }));
  };

  // ✅ 2.3 ฟังก์ชันบันทึกข้อมูล (PUT)
  const saveWorkTimePolicy = async () => {
    if (workTimeSaving) return;

    // Validation
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
      // สร้าง Request Array เพื่อยิง API ทีละ Role
      const requests = Object.entries(workTimeByRole).map(([role, time]) => {
        const [startHour, startMin] = time.start.split(":").map(Number);
        const [endHour, endMin] = time.end.split(":").map(Number);

        // แปลงชื่อ Role กลับเป็นรูปแบบที่ DB ต้องการ (เช่น "WORKER" -> "Worker")
        let dbRole = role;
        if (role === "WORKER") dbRole = "Worker";
        if (role === "HR") dbRole = "HR"; // หรือ "Hr" แล้วแต่ DB ของคุณเก็บ

        return fetch(`${API_BASE}/attendance/work-config`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ role: dbRole, startHour, startMin, endHour, endMin })
        }).then(async (res) => {
          const d = await res.json();
          if (!res.ok) throw new Error(d.error || `Failed to update ${role}`);
          return d;
        });
      });

      await Promise.all(requests);
      await alertSuccess("Saved", "Work time per role saved to database.");
      
      // โหลดข้อมูลล่าสุดเพื่อความชัวร์
      fetchWorkConfigs();

    } catch (e) {
      console.error(e);
      alertError("Save Failed", e.message || "Unable to save work time policy.");
    } finally {
      setWorkTimeSaving(false);
    }
  };

  // =========================================
  // 3. Max Consecutive Holidays
  // =========================================
  const [maxConsecutiveHolidayDays, setMaxConsecutiveHolidayDays] = useState(3);
  const [maxConsecutiveSaving, setMaxConsecutiveSaving] = useState(false);

  const saveMaxConsecutivePolicy = async () => {
  if (maxConsecutiveSaving) return;

  const value = Number(maxConsecutiveHolidayDays);
  if (value < 1 || value > 365) {
    return alertError(
      "Invalid Limit",
      "Max consecutive days must be between 1 and 365."
    );
  }

  const ok = await alertConfirm(
    "Save Max Consecutive Holidays?",
    buildMaxConsecutiveConfirmHtml(value),
    "Save"
  );
  if (!ok) return;

  setMaxConsecutiveSaving(true);
  try {

    // ✅ ใช้ service ที่คุณมีอยู่แล้ว
    const year = new Date().getFullYear();

    await updateSystemConfig(
      year,
      Number(maxConsecutiveHolidayDays)
    );



    await alertSuccess(
      "Saved",
      `Max consecutive holidays updated to ${value} day(s).`
    );
  } catch (e) {
    console.error(e);
    alertError("Save Failed", e.message || "Unable to save policy.");
  } finally {
    setMaxConsecutiveSaving(false);
  }
};


// =========================================
// 4. Special Holidays (FULL - MERGED)
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
    const res = await fetch(`${API_BASE}/holidays?year=${year}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();

    if (res.ok) {
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

useEffect(() => {
  fetchSpecialHolidays();
}, [fetchSpecialHolidays]);

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
      await fetch(`${API_BASE}/holidays/${editId}`, {
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

      await fetch(`${API_BASE}/holidays`, {
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
    await fetch(`${API_BASE}/holidays/${row.id}`, {
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
  () =>
    [...specialHolidays].sort((a, b) =>
      safeYMD(a.startDate).localeCompare(safeYMD(b.startDate))
    ),
  [specialHolidays]
);


  const value = {
    workingDays,
    toggleWorkingDay,
    policySaving,
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