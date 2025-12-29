import React, { createContext, useContext, useMemo, useState } from "react";
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

export function HolidayPolicyProvider({ children }) {
  // Working Days
  const [workingDays, setWorkingDays] = useState(["MON", "TUE", "WED", "THU", "FRI"]);
  const [policySaving, setPolicySaving] = useState(false);

  const toggleWorkingDay = (k) => {
    setWorkingDays((prev) => {
      const p = Array.isArray(prev) ? prev : [];
      return p.includes(k) ? p.filter((x) => x !== k) : [...p, k];
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
      await new Promise((r) => setTimeout(r, 250));
      await alertSuccess("Saved", "Working Days saved.");
    } catch (e) {
      console.error(e);
      alertError("Save Failed", "Unable to save policy.");
    } finally {
      setPolicySaving(false);
    }
  };

  // Work Time by Role
  const [workTimeByRole, setWorkTimeByRole] = useState({
    HR: { start: "09:00", end: "18:00" },
    WORKER: { start: "09:00", end: "18:00" },
  });
  const [workTimeSaving, setWorkTimeSaving] = useState(false);

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
      await new Promise((r) => setTimeout(r, 300));
      await alertSuccess("Saved", "Work time per role saved.");
    } catch (e) {
      console.error(e);
      alertError("Save Failed", "Unable to save work time policy.");
    } finally {
      setWorkTimeSaving(false);
    }
  };

  // Max Consecutive Holidays
  const [maxConsecutiveHolidayDays, setMaxConsecutiveHolidayDays] = useState(3);
  const [maxConsecutiveSaving, setMaxConsecutiveSaving] = useState(false);

  const saveMaxConsecutivePolicy = async () => {
    if (maxConsecutiveSaving) return;

    if (Number(maxConsecutiveHolidayDays) < 1 || Number(maxConsecutiveHolidayDays) > 365) {
      alertError("Invalid Limit", "Max consecutive holidays must be between 1 and 365 days.");
      return;
    }

    const ok = await alertConfirm(
      "Save Max Consecutive Holidays?",
      buildMaxConsecutiveConfirmHtml(maxConsecutiveHolidayDays),
      "Save"
    );
    if (!ok) return;

    setMaxConsecutiveSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      await alertSuccess("Saved", `Max consecutive holiday days saved: ${Number(maxConsecutiveHolidayDays)} day(s).`);
    } catch (e) {
      console.error(e);
      alertError("Save Failed", "Unable to save max consecutive holidays.");
    } finally {
      setMaxConsecutiveSaving(false);
    }
  };

  // Special Holidays (Add/Edit/Delete)
  const [specialHolidays, setSpecialHolidays] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [holidayName, setHolidayName] = useState("");
  const [holidayStart, setHolidayStart] = useState("");
  const [holidayEnd, setHolidayEnd] = useState("");

  const resetHolidayForm = () => {
    setEditId(null);
    setHolidayName("");
    setHolidayStart("");
    setHolidayEnd("");
  };

  const openAddForm = () => {
    setFormOpen(true);
    resetHolidayForm();
    const t = toYMD(new Date());
    setHolidayStart(t);
    setHolidayEnd(t);
  };

  const onEditHoliday = (row) => {
    setFormOpen(true);
    setEditId(row.id);
    setHolidayName(row.name || "");
    setHolidayStart(safeYMD(row.startDate));
    setHolidayEnd(safeYMD(row.endDate));
  };

  const upsertSpecialHoliday = async () => {
    const name = String(holidayName || "").trim();
    const start = safeYMD(holidayStart);
    const end = safeYMD(holidayEnd);

    if (!name) return alertError("Missing Name", "Please enter holiday name.");
    if (!start || start.length !== 10) return alertError("Missing Start Date", "Please select a valid start date.");
    if (!end || end.length !== 10) return alertError("Missing End Date", "Please select a valid end date.");
    if (start > end) return alertError("Invalid Range", "Start date must be before or equal to end date.");

    const total = calcTotalDays(start, end);
    if (total <= 0) return alertError("Invalid Range", "Please check date range.");
    if (total > Number(maxConsecutiveHolidayDays || 0)) {
      return alertError(
        "Exceeded Limit",
        `Holiday duration is ${total} day(s). Max consecutive allowed is ${Number(maxConsecutiveHolidayDays)} day(s).`
      );
    }

    const mode = editId ? "Update Holiday" : "Add Holiday";
    const ok = await alertConfirm(
      editId ? "Confirm Update?" : "Confirm Add?",
      buildHolidayUpsertConfirmHtml({ name, start, end, total, mode }),
      editId ? "Update" : "Add"
    );
    if (!ok) return;

    if (editId) {
      setSpecialHolidays((prev) =>
        (prev || []).map((x) => (x.id === editId ? { ...x, startDate: start, endDate: end, name } : x))
      );
      await alertSuccess("Updated", "Holiday updated successfully.");
    } else {
      const newItem = {
        id: typeof crypto !== "undefined" && crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        startDate: start,
        endDate: end,
        name,
      };
      setSpecialHolidays((prev) => [...(prev || []), newItem]);
      await alertSuccess("Added", "Holiday added successfully.");
    }

    setFormOpen(false);
    resetHolidayForm();
  };

  const onDeleteHoliday = async (row) => {
    const start = safeYMD(row?.startDate);
    const end = safeYMD(row?.endDate);
    const total = calcTotalDays(start, end);

    const ok = await alertConfirm(
      "Delete this holiday?",
      buildHolidayDeleteConfirmHtml({ name: row?.name || "Holiday", start, end, total }),
      "Delete"
    );
    if (!ok) return;

    setSpecialHolidays((prev) => (prev || []).filter((x) => x.id !== row.id));
    await alertSuccess("Deleted", "Holiday removed successfully.");
  };

  const sortedSpecialHolidays = useMemo(() => {
    const list = Array.isArray(specialHolidays) ? specialHolidays : [];
    return [...list].sort((a, b) => safeYMD(a.startDate).localeCompare(safeYMD(b.startDate)));
  }, [specialHolidays]);

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
