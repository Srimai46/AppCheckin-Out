import React, { useEffect, useMemo, useState } from "react";
import { format as fmt, differenceInCalendarDays, parseISO } from "date-fns";
import TimePicker from "../components/TimePicker";

import { getSystemConfigs, processCarryOver, reopenYear } from "../api/leaveService";

import {
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  Info,
  Save,
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const safeYMD = (v) => String(v || "").trim().slice(0, 10);

const ymdToDDMMYYYY = (ymd) => {
  const s = safeYMD(ymd);
  if (!s || s.length !== 10) return "-";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "-";
  return `${d}-${m}-${y}`;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const YearEndProcessing = () => {
  // ===================== EXISTING: YEAR END =====================
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);

  const [quotas, setQuotas] = useState({
    ANNUAL: 0,
    SICK: 0,
    PERSONAL: 0,
    EMERGENCY: 0,
  });

  const handleQuotaChange = (type, value) => {
    setQuotas((prev) => ({ ...prev, [type]: Number(value) }));
  };

  const lastYear = useMemo(() => Number(targetYear) - 1, [targetYear]);

  const fetchConfigs = async () => {
    try {
      const data = await getSystemConfigs();
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch error:", error);
      alertError("Failed to Load Data", "Unable to retrieve system configuration.");
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // ===================== ✅ NEW: Carry Over limit per type =====================
  const [carryOverLimits, setCarryOverLimits] = useState({
    ANNUAL: 0,
    SICK: 0,
    PERSONAL: 0,
    EMERGENCY: 0,
  });

  const handleCarryOverChange = (type, value) => {
    setCarryOverLimits((prev) => ({
      ...prev,
      [type]: clamp(Number(value || 0), 0, 365),
    }));
  };

  const [carrySaving, setCarrySaving] = useState(false);

  const buildCarryOverConfirmHtml = () => {
    const co = carryOverLimits || {};
    const rows = Object.keys(co).map((k) => {
      const v = Number(co[k] ?? 0);
      return `
        <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,.06);">
          <div style="font-weight:900; letter-spacing:.06em; font-size:12px;">${escapeHtml(k)}</div>
          <div style="font-weight:900; font-size:12px; color:#111827;">
            ${escapeHtml(String(v))} day(s)
          </div>
        </div>
      `;
    });

    return `
      <div style="text-align:left; line-height:1.7;">
        <div style="font-weight:900; margin-bottom:8px;">Confirm Carry Over Limits</div>
        <div style="font-size:12px; opacity:.85; margin-bottom:10px;">
          You are about to save these carry over limits (per employee).
        </div>
        <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
          ${rows.join("")}
        </div>
      </div>
    `.trim();
  };

  const saveCarryOverLimits = async () => {
    if (carrySaving) return;

    // validation
    for (const k of Object.keys(carryOverLimits)) {
      const v = Number(carryOverLimits[k]);
      if (Number.isNaN(v) || v < 0 || v > 365) {
        alertError("Invalid Carry Over", `${k} must be between 0 and 365.`);
        return;
      }
    }

    const ok = await alertConfirm(
      "Save Custom Holidays Carry Over?",
      buildCarryOverConfirmHtml(),
      "Save"
    );
    if (!ok) return;

    setCarrySaving(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      await alertSuccess("Saved", "Carry Over limits saved.");
    } catch (e) {
      console.error(e);
      alertError("Save Failed", "Unable to save carry over limits.");
    } finally {
      setCarrySaving(false);
    }
  };

  const escapeHtml = (v = "") =>
    String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // ===================== ✅ NEW: HOLIDAY POLICY & SPECIAL HOLIDAYS (FE ONLY) =====================
  const [workingDays, setWorkingDays] = useState(["MON", "TUE", "WED", "THU", "FRI"]);
  const [policySaving, setPolicySaving] = useState(false);

  // ✅ NEW: Work time per role
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

  const isValidTime = (t) => /^\d{2}:\d{2}$/.test(String(t || ""));

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

    const ok = await alertConfirm(
      "Save Work Time?",
      buildWorkTimeConfirmHtml(),
      "Save"
    );
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

  const buildWorkTimeConfirmHtml = () => {
    const roles = [
      { k: "HR", label: "HR" },
      { k: "WORKER", label: "Worker" },
    ];

    const rows = roles.map((r) => {
      const start = workTimeByRole?.[r.k]?.start || "-";
      const end = workTimeByRole?.[r.k]?.end || "-";
      return `
        <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,.06);">
          <div style="font-weight:900; letter-spacing:.06em; font-size:12px;">${escapeHtml(r.label)}</div>
          <div style="font-weight:900; font-size:12px; color:#111827;">
            ${escapeHtml(String(start))} - ${escapeHtml(String(end))}
          </div>
        </div>
      `;
    });

    return `
      <div style="text-align:left; line-height:1.7;">
        <div style="font-weight:900; margin-bottom:8px;">Confirm Work Time (By Role)</div>
        <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
          ${rows.join("")}
        </div>
      </div>
    `.trim();
  };

  // ✅ HR sets max "consecutive" holidays allowed
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
      buildMaxConsecutiveConfirmHtml(),
      "Save"
    );
    if (!ok) return;

    setMaxConsecutiveSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      await alertSuccess(
        "Saved",
        `Max consecutive holiday days saved: ${Number(maxConsecutiveHolidayDays)} day(s).`
      );
    } catch (e) {
      console.error(e);
      alertError("Save Failed", "Unable to save max consecutive holidays.");
    } finally {
      setMaxConsecutiveSaving(false);
    }
  };

  const buildMaxConsecutiveConfirmHtml = () => {
    return `
      <div style="text-align:left; line-height:1.7;">
        <div style="font-weight:900; margin-bottom:8px;">Confirm Max Consecutive Holidays</div>
        <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <div style="font-weight:900; font-size:12px;">Max consecutive days</div>
            <div style="font-weight:900; font-size:12px; color:#111827;">
              ${escapeHtml(String(maxConsecutiveHolidayDays))} day(s)
            </div>
          </div>
        </div>
      </div>
    `.trim();
  };        

  // Special Holidays list
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

  const calcTotalDays = (startYMD, endYMD) => {
    const s = safeYMD(startYMD);
    const e = safeYMD(endYMD);
    if (!s || !e) return 0;
    try {
      const sd = parseISO(s);
      const ed = parseISO(e);
      if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) return 0;
      const diff = differenceInCalendarDays(ed, sd);
      return diff >= 0 ? diff + 1 : 0;
    } catch {
      return 0;
    }
  };

  const sortedSpecialHolidays = useMemo(() => {
    const list = Array.isArray(specialHolidays) ? specialHolidays : [];
    return [...list].sort((a, b) => safeYMD(a.startDate).localeCompare(safeYMD(b.startDate)));
  }, [specialHolidays]);

  const saveWorkingDaysPolicy = async () => {
    if (policySaving) return;

    if (!Array.isArray(workingDays) || workingDays.length === 0) {
      alertError("Invalid Working Days", "Please select at least 1 working day.");
      return;
    }

    const ok = await alertConfirm(
      "Save Working Days?",
      buildWorkingDaysConfirmHtml(),
      "Save"
    );
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

  const buildWorkingDaysConfirmHtml = () => {
    const order = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const label = { MON:"Mon", TUE:"Tue", WED:"Wed", THU:"Thu", FRI:"Fri", SAT:"Sat", SUN:"Sun" };
    const selected = (workingDays || []).slice().sort((a,b)=>order.indexOf(a)-order.indexOf(b));

    return `
      <div style="text-align:left; line-height:1.7;">
        <div style="font-weight:900; margin-bottom:8px;">Confirm Working Days</div>
        <div style="font-size:12px; opacity:.85; margin-bottom:10px;">
          Selected working days:
        </div>
        <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
          <div style="font-weight:900; font-size:12px;">
            ${escapeHtml(selected.map((d)=>label[d]||d).join(", ") || "-")}
          </div>
        </div>
      </div>
    `.trim();
  };

  const upsertSpecialHoliday = async () => {
    const name = String(holidayName || "").trim();
    const start = safeYMD(holidayStart);
    const end = safeYMD(holidayEnd);

    if (!name) {
      alertError("Missing Name", "Please enter holiday name.");
      return;
    }
    if (!start || start.length !== 10) {
      alertError("Missing Start Date", "Please select a valid start date.");
      return;
    }
    if (!end || end.length !== 10) {
      alertError("Missing End Date", "Please select a valid end date.");
      return;
    }
    if (start > end) {
      alertError("Invalid Range", "Start date must be before or equal to end date.");
      return;
    }

    try {
      const total = calcTotalDays(start, end);
      if (total <= 0) {
        alertError("Invalid Range", "Please check date range.");
        return;
      }

      // ✅ rule: max consecutive days
      if (total > Number(maxConsecutiveHolidayDays || 0)) {
        alertError(
          "Exceeded Limit",
          `Holiday duration is ${total} day(s). Max consecutive allowed is ${Number(
            maxConsecutiveHolidayDays
          )} day(s).`
        );
        return;
      }

      // ✅ Confirm ก่อนบันทึก (Add/Update)
      const mode = editId ? "Update Holiday" : "Add Holiday";
      const ok = await alertConfirm(
        editId ? "Confirm Update?" : "Confirm Add?",
        buildHolidayUpsertConfirmHtml({ name, start, end, total, mode }),
        editId ? "Update" : "Add"
      );
      if (!ok) return;

      if (editId) {
        setSpecialHolidays((prev) =>
          (prev || []).map((x) =>
            x.id === editId ? { ...x, startDate: start, endDate: end, name } : x
          )
        );
        await alertSuccess("Updated", "Holiday updated successfully.");
      } else {
        const newItem = {
          id:
            typeof crypto !== "undefined" && crypto?.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          startDate: start,
          endDate: end,
          name,
        };
        setSpecialHolidays((prev) => [...(prev || []), newItem]);
        await alertSuccess("Added", "Holiday added successfully.");
      }

      setFormOpen(false);
      resetHolidayForm();
    } catch (e) {
      console.error(e);
      alertError("Operation Failed", "Unable to save holiday.");
    }
  };

  const buildHolidayUpsertConfirmHtml = ({ name, start, end, total, mode }) => {
    const dateText =
      start === end
        ? `${ymdToDDMMYYYY(start)} (${total} day)`
        : `${ymdToDDMMYYYY(start)} to ${ymdToDDMMYYYY(end)} (${total} days)`;

    return `
      <div style="text-align:left; line-height:1.7;">
        <div style="font-weight:900; margin-bottom:8px;">Confirm ${escapeHtml(mode)}</div>
        <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
          <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0;">
            <div style="font-weight:900; font-size:12px;">Holiday</div>
            <div style="font-weight:900; font-size:12px; color:#111827;">${escapeHtml(name)}</div>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0;">
            <div style="font-weight:900; font-size:12px;">Date</div>
            <div style="font-weight:900; font-size:12px; color:#111827;">${escapeHtml(dateText)}</div>
          </div>
        </div>
      </div>
    `.trim();
  };

  const onEditHoliday = (row) => {
    setFormOpen(true);
    setEditId(row.id);
    setHolidayName(row.name || "");
    setHolidayStart(safeYMD(row.startDate));
    setHolidayEnd(safeYMD(row.endDate));
  };

  const buildHolidayDeleteConfirmHtml = (row) => {
    const start = safeYMD(row?.startDate);
    const end = safeYMD(row?.endDate);
    const total = calcTotalDays(start, end);

    const dateText =
      start === end
        ? `${ymdToDDMMYYYY(start)} (${total} day)`
        : `${ymdToDDMMYYYY(start)} to ${ymdToDDMMYYYY(end)} (${total} days)`;

    return `
      <div style="text-align:left; line-height:1.7;">
        <div style="font-weight:900; margin-bottom:8px;">Confirm Delete Holiday</div>
        <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#fff7ed;">
          <div style="font-weight:900; font-size:12px; margin-bottom:6px;">
            ${escapeHtml(row?.name || "Holiday")}
          </div>
          <div style="font-size:12px; font-weight:800; color:#111827;">
            ${escapeHtml(dateText)}
          </div>
        </div>
        <div style="margin-top:8px; font-size:12px; opacity:.8;">
          This action cannot be undone.
        </div>
      </div>
    `.trim();
  };

  const onDeleteHoliday = async (row) => {
    const ok = await alertConfirm(
      "Delete this holiday?",
      buildHolidayDeleteConfirmHtml(row),
      "Delete"
    );
    if (!ok) return;

    setSpecialHolidays((prev) => (prev || []).filter((x) => x.id !== row.id));
    await alertSuccess("Deleted", "Holiday removed successfully.");
  };

  const buildProcessConfirmHtml = () => {
    const co = carryOverLimits || {};
    const items = [
      `The system will process year-end for <b>${escapeHtml(targetYear)}</b> and lock <b>${escapeHtml(
        lastYear
      )}</b>.`,
      `New quotas for <b>${escapeHtml(targetYear)}</b>:
        Annual <b>${escapeHtml(quotas.ANNUAL)}</b>,
        Sick <b>${escapeHtml(quotas.SICK)}</b>,
        Personal <b>${escapeHtml(quotas.PERSONAL)}</b>,
        Emergency <b>${escapeHtml(quotas.EMERGENCY)}</b>.`,
      `Carry Over limits (per type):
        Annual <b>${escapeHtml(co.ANNUAL)}</b>,
        Sick <b>${escapeHtml(co.SICK)}</b>,
        Personal <b>${escapeHtml(co.PERSONAL)}</b>,
        Emergency <b>${escapeHtml(co.EMERGENCY)}</b>.`,
      `Max consecutive holiday days allowed: <b>${escapeHtml(maxConsecutiveHolidayDays)}</b> day(s).`,
    ];

    return `
      <div style="text-align:left; line-height:1.7;">
        <div style="font-weight:900; margin-bottom:8px;">Year-End Processing Summary</div>
        <ul style="margin:0; padding-left:18px;">
          ${items.map((t) => `<li>${t}</li>`).join("")}
        </ul>
        <div style="margin-top:10px; font-size:12px; opacity:.8;">
          Please review the values carefully before confirming.
        </div>
      </div>
    `.trim();
  };

  const handleProcess = async () => {
    if (loading) return;

    const confirmed = await alertConfirm(
      "Confirm Year-End Processing",
      buildProcessConfirmHtml(),
      "Confirm & Process"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await processCarryOver({
        targetYear: Number(targetYear),
        quotas: quotas,
        carryOverLimits: carryOverLimits,
      });

      await alertSuccess(
        "Processed Successfully",
        res?.message || "Year-end processing and quota assignment completed successfully."
      );
      await fetchConfigs();
    } catch (error) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "An error occurred during processing.";

      alertError("Processing Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async (year) => {
    const confirmed = await alertConfirm(
      "Confirm Unlock",
      `
        <div style="text-align:left; line-height:1.7;">
          Do you want to unlock <b>${escapeHtml(year)}</b>?
          <div style="margin-top:8px; font-size:12px; opacity:.8;">
            Once unlocked, this year will be set to <b>Open</b> and can be edited again.
          </div>
        </div>
      `.trim(),
      "Unlock Year"
    );
    if (!confirmed) return;

    try {
      await reopenYear(year);
      await alertSuccess("Unlocked", `Year ${year} has been unlocked successfully.`);
      fetchConfigs();
    } catch (error) {
      const msg =
        error?.response?.data?.error || error?.response?.data?.message || error?.message || "Unknown error";

      alertError("Unlock Failed", msg);
    }
  };

  const [targetYearOpen, setTargetYearOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const FUTURE_YEARS = 3;
  const years = Array.from({ length: FUTURE_YEARS }, (_, i) => currentYear + i);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* ===================== ✅ NEW PANEL: HOLIDAY POLICY & SPECIAL HOLIDAYS ===================== */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-indigo-600" />
                Holiday Policy & Special Holidays
              </h1>
              <p className="text-gray-500">
                Configure working days and manage special holidays (Front-end only for now).
              </p>
            </div>
          </header>

          {/* ===== Working Days (top) + Save ===== */}
          <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
                Working Days
              </div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Select working days and save policy
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { k: "MON", label: "Mon" },
                  { k: "TUE", label: "Tue" },
                  { k: "WED", label: "Wed" },
                  { k: "THU", label: "Thu" },
                  { k: "FRI", label: "Fri" },
                  { k: "SAT", label: "Sat" },
                  { k: "SUN", label: "Sun" },
                ].map((d) => {
                  const active = (workingDays || []).includes(d.k);
                  return (
                    <button key={d.k} type="button"
                      onClick={() =>
                        setWorkingDays((prev) => {
                          const p = Array.isArray(prev) ? prev : [];
                          return p.includes(d.k) ? p.filter((x) => x !== d.k) : [...p, d.k];
                        })
                      }
                      className={`h-10 px-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
                        ${
                          active
                            ? "bg-white border-indigo-300 ring-2 ring-indigo-100 text-slate-800"
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:text-slate-700 hover:bg-white"
                        }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center
                            ${active ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-300"}`}
                        >
                          {active && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M20 6L9 17l-5-5"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        {d.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 flex-col sm:flex-row">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Currently:{" "}
                  <span className="text-slate-600">
                    {(workingDays || []).map((x) => x.toLowerCase()).join(", ") || "-"}
                  </span>
                </div>

                <button type="button" onClick={saveWorkingDaysPolicy} disabled={policySaving}
                  className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                    uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
                    shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
                >
                  {policySaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  {policySaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>

          {/* ✅ NEW: Work Time by Role */}
          <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50/50 p-5">
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div>
                <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  Work Time (By Role)
                </div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Set check-in / check-out time for each role
                </div>
              </div>

              <button type="button" onClick={saveWorkTimePolicy} disabled={workTimeSaving}
                className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                  uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
                  shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
              >
                {workTimeSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {workTimeSaving ? "Saving..." : "Save Work Time"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {[
                { role: "HR", label: "HR" },
                { role: "WORKER", label: "Worker" },
              ].map((x) => (
                <div key={x.role} className="rounded-3xl bg-white border border-gray-200 p-5">
                  <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">
                    {x.label}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Check-in */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Check-in Time
                      </label>
                      <TimePicker
                        value={workTimeByRole?.[x.role]?.start || "09:00"}
                        onChange={(v) => updateWorkTime(x.role, "start", v)}
                      />
                    </div>

                    {/* Check-out */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Check-out Time
                      </label>
                      <TimePicker
                        value={workTimeByRole?.[x.role]?.end || "18:00"}
                        onChange={(v) => updateWorkTime(x.role, "end", v)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Current:{" "}
                    <span className="text-slate-700">
                      {workTimeByRole?.[x.role]?.start || "-"} - {workTimeByRole?.[x.role]?.end || "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ Max Consecutive Holiday Days + Save */}
          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Max Consecutive Holidays
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Maximum consecutive holiday days allowed per request
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="number" min={1} max={365} value={maxConsecutiveHolidayDays}
                  onChange={(e) => setMaxConsecutiveHolidayDays(clamp(Number(e.target.value || 1), 1, 365))}
                  className="w-24 h-11 px-4 rounded-2xl bg-white border border-gray-200
                    text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  day(s)
                </span>

                <button type="button" onClick={saveMaxConsecutivePolicy} disabled={maxConsecutiveSaving}
                  className="h-11 px-5 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                    uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
                    shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
                >
                  {maxConsecutiveSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {maxConsecutiveSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>

          {/* ===== Special Holidays Form (Add/Edit) ===== */}
          {formOpen && (
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    Special Holidays
                  </div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Add / Edit holiday and apply immediately
                  </div>
                </div>

                <button type="button" onClick={() => {
                    setFormOpen(false);
                    resetHolidayForm();
                  }}
                  className="h-10 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                    font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Holiday Name
                    </label>
                    <input value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g., Songkran Festival"
                      className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                        text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Start Date
                    </label>
                    <input type="date" value={holidayStart} onChange={(e) => setHolidayStart(e.target.value)}
                      className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                        text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      End Date
                    </label>
                    <input type="date" value={holidayEnd} onChange={(e) => setHolidayEnd(e.target.value)}
                      className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                        text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 flex-col sm:flex-row">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Duration:{" "}
                    <span className="text-slate-700">
                      {calcTotalDays(holidayStart, holidayEnd) || 0} day(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {editId && (
                      <button type="button" onClick={() => {
                          resetHolidayForm();
                          setFormOpen(false);
                        }}
                        className="h-11 px-6 rounded-3xl bg-white border border-gray-200 text-slate-700
                          font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                      >
                        Cancel Edit
                      </button>
                    )}

                    <button type="button" onClick={upsertSpecialHoliday}
                      className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                        uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 inline-flex items-center gap-2"
                    >
                      <Plus size={16} />
                      {editId ? "Update" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Special Holidays Table ===== */}
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  Special Holidays Log
                </div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  DD-MM-YYYY (total days), name, edit, delete
                </div>
              </div>

              <button type="button" onClick={openAddForm}
                className="h-10 px-4 rounded-3xl bg-white border border-gray-200 text-slate-800
                  font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
                  inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Add Holiday
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Holiday Name</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {sortedSpecialHolidays.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                        No special holidays yet.
                      </td>
                    </tr>
                  ) : (
                    sortedSpecialHolidays.map((h) => {
                      const totalDays = calcTotalDays(h.startDate, h.endDate);
                      const dateText = safeYMD(h.startDate) === safeYMD(h.endDate)
                          ? `${ymdToDDMMYYYY(h.startDate)} (${totalDays} day)`
                          : `${ymdToDDMMYYYY(h.startDate)} to ${ymdToDDMMYYYY(h.endDate)} (${totalDays} days)`;

                      return (
                        <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-700">{dateText}</td>
                          <td className="px-6 py-4 text-slate-700 font-bold">{h.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={() => onEditHoliday(h)}
                                className="h-9 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                                  font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
                                  inline-flex items-center gap-2"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              <button type="button" onClick={() => onDeleteHoliday(h)}
                                className="h-9 px-4 rounded-3xl border border-rose-100 bg-rose-50 text-rose-700
                                  font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95
                                  inline-flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ===================== ✅ EXISTING YEAR-END PANEL (KEEP) ===================== */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-indigo-600" /> Year-End Processing & Quota Assignment
            </h1>
            <p className="text-gray-500">
              Carry over leave balances and assign new yearly quotas in one step.
            </p>
          </header>

          {/* ✅ Custom Holidays Carry Over limit per type */}
          <div className="rounded-3xl border border-gray-100 bg-gray-50/50 p-5 mb-6">
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div>
                <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Custom Holidays Carry Over
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Maximum carry over days to next year (per employee) — separated by type
                </div>
              </div>

              <button type="button" onClick={saveCarryOverLimits} disabled={carrySaving}
                className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                  uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
                  shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
              >
                {carrySaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {carrySaving ? "Saving..." : "Save Carry Over"}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              {Object.keys(carryOverLimits).map((type) => (
                <div key={type}>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">
                    {type}
                  </label>
                  <input type="number" min={0} max={365} value={carryOverLimits[type]} onChange={(e) => handleCarryOverChange(type, e.target.value)}
                    className="w-full border border-gray-200 rounded-3xl px-3 py-2 text-sm font-bold
                      focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Processing & Quota Settings */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-3xl text-indigo-600">
                <Info size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">
                  Configure Quotas for {targetYear}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Set the base leave quotas to be assigned to all employees along with carry-over.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.keys(quotas).map((type) => (
                    <div key={type}>
                      <label className="block text-xs font-black text-gray-400 uppercase mb-1">
                        {type}
                      </label>
                      <input type="number" value={quotas[type]} onChange={(e) => handleQuotaChange(type, e.target.value)}
                        className="w-full border border-gray-200 rounded-3xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                  <div className="flex flex-col relative w-44">
                    <span className="text-xs text-gray-400 font-bold mb-1">Target Year</span>

                    <button
                      type="button"
                      onClick={() => setTargetYearOpen((v) => !v)}
                      className={`w-full bg-white border border-gray-300 rounded-3xl px-4 py-2 text-sm font-black text-slate-700
                        flex items-center justify-between transition-all hover:bg-gray-50
                        ${targetYearOpen ? "ring-2 ring-blue-100" : ""}`}
                    >
                      <span>Year {targetYear}</span>
                      <svg className={`w-4 h-4 transition-transform ${targetYearOpen ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {targetYearOpen && (
                      <>
                        <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setTargetYearOpen(false)} aria-label="Close target year dropdown" />
                        <div className="absolute z-20 mt-2 w-full rounded-3xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                          {years.map((y) => (
                            <button key={y} type="button" onClick={() => {
                                setTargetYear(y);
                                setTargetYearOpen(false);
                              }}
                              className={`w-full px-6 py-3 text-left text-sm font-black transition-all hover:bg-blue-50
                                ${targetYear === y ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                            >
                              Year {y}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={handleProcess} disabled={loading}
                    className="mt-5 bg-indigo-600 text-white px-8 py-2.5 rounded-3xl hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    {loading ? "Processing..." : "Confirm & Process"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Processing History
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4">Lock Status</th>
                    <th className="px-6 py-4 text-center">Processed At</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {configs.length > 0 ? (
                    configs.map((config) => (
                      <tr key={config.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-700">{config.year}</td>

                        <td className="px-6 py-4">
                          {config.isClosed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase">
                              <Lock size={12} /> Closed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase">
                              <Unlock size={12} /> Open
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center text-gray-500 text-xs font-medium">
                          {config.closedAt ? new Date(config.closedAt).toLocaleString("en-US") : "-"}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {config.isClosed && (
                            <button
                              onClick={() => handleReopen(config.year)}
                              className="text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-3xl transition-all text-[11px] font-black uppercase tracking-tighter border border-orange-100"
                            >
                              Unlock This Year
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic text-sm">
                        No processing history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ❗ DO NOT CHANGE THIS WARNING BLOCK (as requested) */}
          <div className="mt-6 flex items-center gap-3 text-amber-700 bg-amber-50 p-4 rounded-3xl border border-amber-100">
            <AlertTriangle size={20} className="shrink-0" />
            <div className="text-xs font-bold leading-relaxed uppercase tracking-tight">
              Warning: Pressing this button will "overwrite" the quotas for all employees in the target year. And immediately lock last year's
              data. Please ensure the correct number of leave days to be distributed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearEndProcessing;
