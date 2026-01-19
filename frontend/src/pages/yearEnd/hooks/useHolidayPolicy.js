// frontend/src/pages/yearEnd/hooks/useHolidayPolicy.js
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
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

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
  const [workingDays, setWorkingDays] = useState([
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
  ]);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);

  const fetchWorkingDaysPolicy = useCallback(async () => {
    try {
      setPolicyLoading(true);
      const data = await fetchJson(`${API_HOST}/api/holidays/working-days`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const arr = Array.isArray(data?.workingDays)
        ? data.workingDays
        : ["MON", "TUE", "WED", "THU", "FRI"];

      setWorkingDays(arr);
    } catch (e) {
      console.error(e);
      alertError(t("holidayPolicy.errors.loadFailedTitle"), e.message);
      setWorkingDays(["MON", "TUE", "WED", "THU", "FRI"]);
    } finally {
      setPolicyLoading(false);
    }
  }, [t]);

  const toggleWorkingDay = (k) => {
    setWorkingDays((prev) => {
      const kk = String(k || "").toUpperCase();
      return prev.includes(kk) ? prev.filter((x) => x !== kk) : [...prev, kk];
    });
  };

  const saveWorkingDaysPolicy = async () => {
    if (policySaving) return;
    if (!workingDays.length)
      return alertError(
        t("holidayPolicy.errors.invalidTitle"),
        t("holidayPolicy.errors.selectAtLeastOneDay")
      );

    const ok = await alertConfirm(
      t("workingDays.confirmTitle"),
      buildWorkingDaysConfirmHtml(workingDays),
      t("common.save")
    );
    if (!ok) return;

    setPolicySaving(true);
    try {
      await fetchJson(`${API_HOST}/api/holidays/working-days`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ workingDays }),
      });

      await alertSuccess(
        t("holidayPolicy.success.savedTitle"),
        t("workingDays.savedText")
      );
    } catch (e) {
      alertError(t("holidayPolicy.errors.saveFailedTitle"), e.message);
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
      const token = getToken();
      if (!token) return;

      const result = await fetchJson(`${API_HOST}/api/attendance/work-config`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(result?.data)) {
        const map = {};
        result.data.forEach((i) => {
          map[String(i.role).toUpperCase()] = {
            start: `${String(i.startHour).padStart(2, "0")}:${String(
              i.startMin
            ).padStart(2, "0")}`,
            end: `${String(i.endHour).padStart(2, "0")}:${String(i.endMin).padStart(
              2,
              "0"
            )}`,
          };
        });
        setWorkTimeByRole((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      console.error(e);
      // (เดิมไม่ได้ alert) คง behavior เดิม
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

    for (const [role, tt] of Object.entries(workTimeByRole)) {
      if (!isValidTime(tt.start) || !isValidTime(tt.end))
        return alertError(t("holidayPolicy.errors.invalidTimeTitle"), role);
      if (tt.start >= tt.end)
        return alertError(t("holidayPolicy.errors.invalidRangeTitle"), role);
    }

    const ok = await alertConfirm(
      t("workTimeByRole.confirmTitle"),
      buildWorkTimeConfirmHtml(workTimeByRole),
      t("common.save")
    );
    if (!ok) return;

    setWorkTimeSaving(true);
    try {
      const token = getToken();
      await Promise.all(
        Object.entries(workTimeByRole).map(([role, tt]) => {
          const [sh, sm] = tt.start.split(":").map(Number);
          const [eh, em] = tt.end.split(":").map(Number);
          return fetchJson(`${API_HOST}/api/attendance/work-config`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role,
              startHour: sh,
              startMin: sm,
              endHour: eh,
              endMin: em,
            }),
          });
        })
      );

      await alertSuccess(
        t("holidayPolicy.success.savedTitle"),
        t("workTimeByRole.savedText")
      );
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

      setMaxConsecutiveHolidayDays(
        clamp(Number(data?.maxConsecutiveHolidayDays || 3), 1, 365)
      );
    } catch {
      false;
    }
  }, []);

  const saveMaxConsecutivePolicy = async () => {
    if (maxConsecutiveSaving) return;

    const v = Number(maxConsecutiveHolidayDays);
    if (v < 1 || v > 365)
      return alertError(t("holidayPolicy.errors.invalidLimitTitle"));

    const ok = await alertConfirm(
      t("maxConsecutive.confirmTitle"),
      buildMaxConsecutiveConfirmHtml(v),
      t("common.save")
    );
    if (!ok) return;

    setMaxConsecutiveSaving(true);
    try {
      await fetchJson(`${API_HOST}/api/holidays/max-consecutive`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ days: v }),
      });

      await alertSuccess(
        t("holidayPolicy.success.savedTitle"),
        t("maxConsecutive.savedText")
      );
    } catch (e) {
      alertError(t("holidayPolicy.errors.saveFailedTitle"), e.message);
    } finally {
      setMaxConsecutiveSaving(false);
    }
  };

  // =========================================
  // 4. Special Holidays (⭐ FIXED)
  // =========================================
  const [specialHolidays, setSpecialHolidays] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [holidayName, setHolidayName] = useState({});
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
            name: typeof h.name === "string" ? { th: h.name } : h.name,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const resetHolidayForm = () => {
    setEditId(null);
    setHolidayName({});
    setHolidayStart("");
    setHolidayEnd("");
  };

  const openAddForm = () => {
    resetHolidayForm();
    setFormOpen(true);
    const today = toYMD(new Date());
    setHolidayStart(today);
    setHolidayEnd(today);
  };

  const onEditHoliday = (row) => {
    setFormOpen(true);
    setEditId(row.id);
    setHolidayName(
      typeof row.name === "string" ? { th: row.name } : row.name || {}
    );
    setHolidayStart(safeYMD(row.startDate));
    setHolidayEnd(safeYMD(row.endDate));
  };

  const upsertSpecialHoliday = async () => {
    const start = safeYMD(holidayStart);
    const end = safeYMD(holidayEnd);

    if (!hasAtLeastOneName(holidayName))
      return alertError(
        t("holidayPolicy.errors.missingNameTitle"),
        t("holidayPolicy.errors.enterAtLeastOneLanguage")
      );
    if (!start || !end) return alertError(t("holidayPolicy.errors.missingDateTitle"));
    if (start > end) return alertError(t("holidayPolicy.errors.invalidRangeTitle"));

    const total = calcTotalDays(start, end);

    const ok = await alertConfirm(
      editId ? t("specialHoliday.confirm.updateTitle") : t("specialHoliday.confirm.addTitle"),
      buildHolidayUpsertConfirmHtml({
        name: holidayName,
        start,
        end,
        total,
        mode: editId ? "Update" : "Add",
      }),
      editId ? t("common.update") : t("common.add")
    );
    if (!ok) return;

    try {
      if (editId) {
        await fetchJson(`${API_HOST}/api/holidays/${editId}`, {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name: holidayName, date: start }),
        });
        await alertSuccess(
          t("holidayPolicy.success.updatedTitle"),
          t("specialHoliday.toast.updated")
        );
      } else {
        const holidays = [];
        let d = new Date(start);
        const last = new Date(end);

        while (d <= last) {
          holidays.push({
            date: toYMD(d),
            name: holidayName,
            isSubsidy: false,
          });
          d.setDate(d.getDate() + 1);
        }

        await fetchJson(`${API_HOST}/api/holidays`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ holidays }),
        });

        await alertSuccess(
          t("holidayPolicy.success.addedTitle"),
          t("specialHoliday.toast.added")
        );
      }

      fetchSpecialHolidays();
      setFormOpen(false);
      resetHolidayForm();
    } catch (e) {
      alertError(t("common.error"), e.message);
    }
  };

  const onDeleteHoliday = async (row) => {
    const start = safeYMD(row.startDate);
    const total = calcTotalDays(start, safeYMD(row.endDate));

    const ok = await alertConfirm(
      t("specialHoliday.confirm.deleteTitle"),
      buildHolidayDeleteConfirmHtml({
        name: row.name,
        start,
        end: row.endDate,
        total,
      }),
      t("common.delete")
    );
    if (!ok) return;

    try {
      await fetchJson(`${API_HOST}/api/holidays/${row.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      await alertSuccess(
        t("holidayPolicy.success.deletedTitle"),
        t("specialHoliday.toast.deleted")
      );
      fetchSpecialHolidays();
    } catch (e) {
      alertError(t("common.error"), e.message);
    }
  };

  const sortedSpecialHolidays = useMemo(
    () =>
      [...specialHolidays].sort((a, b) =>
        safeYMD(a.startDate).localeCompare(safeYMD(b.startDate))
      ),
    [specialHolidays]
  );

  // =========================================
  // initial load
  // =========================================
  useEffect(() => {
    fetchWorkingDaysPolicy();
    fetchWorkConfigs();
    fetchMaxConsecutivePolicy();
    fetchSpecialHolidays();
  }, [
    fetchWorkingDaysPolicy,
    fetchWorkConfigs,
    fetchMaxConsecutivePolicy,
    fetchSpecialHolidays,
  ]);

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
    setMaxConsecutiveHolidayDays: (v) =>
      setMaxConsecutiveHolidayDays(clamp(Number(v || 1), 1, 365)),
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
  if (!ctx)
    throw new Error("useHolidayPolicy must be used within HolidayPolicyProvider");
  return ctx;
}
