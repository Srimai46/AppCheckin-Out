// frontend/src/pages/csv/xlsxForEmployeesWorkbook.jsx
import { useMemo, useState, useEffect } from "react";
import {
  Download,
  Filter,
  X,
  Loader2,
  FileSpreadsheet,
  CalendarDays,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios";
import * as XLSX from "xlsx";
import DateGridPicker from "../../components/shared/DateGridPicker";

export default function XlsxForEmployeesWorkbook({ open, onClose, employees = [] }) {
  const { t } = useTranslation();

  // -------------------------
  // UI state
  // -------------------------
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // -------------------------
  // Export Mode
  // -------------------------
  // workbookType:
  // 1) "perEmployeeData" => หลาย sheet: Employee-Name (Attendance/Leave)
  // 2) "employeesList"   => sheet เดียว: รายชื่อพนักงาน
  const [workbookType, setWorkbookType] = useState("perEmployeeData");
  const [exportType, setExportType] = useState("attendance"); // attendance | leave

  // -------------------------
  // Period Filter
  // -------------------------
  const [periodType, setPeriodType] = useState("monthly"); // daily | monthly | yearly | quarter | custom

  // daily
  const [dailyDate, setDailyDate] = useState(""); // yyyy-mm-dd
  // monthly
  const [monthValue, setMonthValue] = useState(""); // yyyy-mm
  // yearly
  const [yearValue, setYearValue] = useState(new Date().getFullYear());
  // quarter
  const [quarterYear, setQuarterYear] = useState(new Date().getFullYear());
  const [quarterValue, setQuarterValue] = useState("Q1");
  // custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // -------------------------
  // DateGridPicker modal control (✅ สำคัญ)
  // -------------------------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // "daily" | "month" | "year" | "qyear" | "from" | "to"

  const openPicker = (target) => {
    if (loading) return;
    setPickerTarget(target);
    setPickerOpen(true);
  };
  const closePicker = () => {
    setPickerOpen(false);
    setPickerTarget(null);
  };

  // -------------------------
  // Clean state when closing
  // -------------------------
  useEffect(() => {
    if (open) return;
    setErrMsg("");
    setPickerOpen(false);
    setPickerTarget(null);
  }, [open]);

  // -------------------------
  // Date helpers
  // -------------------------
  const pad = (n) => String(n).padStart(2, "0");
  const toDateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const startOfMonth = (yyyyMm) => {
    if (!yyyyMm) return "";
    const [y, m] = yyyyMm.split("-").map((x) => parseInt(x, 10));
    return toDateOnly(new Date(y, m - 1, 1));
  };

  const endOfMonth = (yyyyMm) => {
    if (!yyyyMm) return "";
    const [y, m] = yyyyMm.split("-").map((x) => parseInt(x, 10));
    return toDateOnly(new Date(y, m, 0));
  };

  const range = useMemo(() => {
    if (periodType === "daily") return { from: dailyDate || "", to: dailyDate || "" };

    if (periodType === "monthly") {
      return { from: startOfMonth(monthValue), to: endOfMonth(monthValue) };
    }

    if (periodType === "yearly") {
      const y = Number(yearValue);
      if (!y || Number.isNaN(y)) return { from: "", to: "" };
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }

    if (periodType === "quarter") {
      const y = Number(quarterYear);
      if (!y || Number.isNaN(y)) return { from: "", to: "" };
      const map = {
        Q1: { from: `${y}-01-01`, to: `${y}-03-31` },
        Q2: { from: `${y}-04-01`, to: `${y}-06-30` },
        Q3: { from: `${y}-07-01`, to: `${y}-09-30` },
        Q4: { from: `${y}-10-01`, to: `${y}-12-31` },
      };
      return map[quarterValue] || { from: "", to: "" };
    }

    return { from: customFrom || "", to: customTo || "" };
  }, [periodType, dailyDate, monthValue, yearValue, quarterYear, quarterValue, customFrom, customTo]);

  // -------------------------
  // DateGridPicker value/granularity
  // -------------------------
  const pickerGranularity = useMemo(() => {
    if (pickerTarget === "month") return "month";
    if (pickerTarget === "year") return "year";
    if (pickerTarget === "qyear") return "year";
    return "day";
  }, [pickerTarget]);

  const pickerValue = useMemo(() => {
    if (pickerTarget === "daily") return dailyDate || null;
    if (pickerTarget === "month") return monthValue || null;
    if (pickerTarget === "year") return String(yearValue || "") || null;
    if (pickerTarget === "qyear") return String(quarterYear || "") || null;
    if (pickerTarget === "from") return customFrom || null;
    if (pickerTarget === "to") return customTo || null;
    return null;
  }, [pickerTarget, dailyDate, monthValue, yearValue, quarterYear, customFrom, customTo]);

  const handlePickerChange = (v) => {
    const val = v ?? "";

    if (pickerTarget === "daily") setDailyDate(val);
    if (pickerTarget === "month") setMonthValue(val);
    if (pickerTarget === "year") setYearValue(val ? Number(val) : new Date().getFullYear());
    if (pickerTarget === "qyear") setQuarterYear(val ? Number(val) : new Date().getFullYear());
    if (pickerTarget === "from") setCustomFrom(val);
    if (pickerTarget === "to") setCustomTo(val);

    closePicker();
  };

  // -------------------------
  // API helpers
  // -------------------------
  const normalizeRows = (res) => {
    const data = res?.data;
    if (Array.isArray(data)) return data;
    return data?.data || data?.records || data?.requests || data?.items || [];
  };

  const tryGet = async (paths, params) => {
    let lastErr = null;
    for (const p of paths) {
      try {
        const res = await api.get(p, { params });
        return res;
      } catch (e) {
        lastErr = e;
        if (e?.response?.status === 404) continue;
        throw e;
      }
    }
    throw lastErr || new Error("No matching API endpoint (all paths returned 404).");
  };

  const fetchAttendanceRows = async ({ empId, from, to }) => {
    const paths = ["/attendance/records", "/attendance/time-records", "/time-records", "/attendance/history", "/attendance"];

    const paramSets = [
      { employeeId: empId, from, to },
      { employeeId: empId, startDate: from, endDate: to },
      { userId: empId, from, to },
      { userId: empId, startDate: from, endDate: to },
    ];

    let lastErr = null;
    for (const params of paramSets) {
      try {
        const res = await tryGet(paths, params);
        return normalizeRows(res);
      } catch (e) {
        lastErr = e;
        if (e?.response?.status && e.response.status !== 404) throw e;
      }
    }
    throw lastErr || new Error("Attendance export failed (endpoint not found).");
  };

  const fetchLeaveRows = async ({ empId, from, to }) => {
    const paths = ["/leave/requests", "/leave/history", "/leave", "/leave-requests"];

    const paramSets = [
      { employeeId: empId, from, to },
      { employeeId: empId, startDate: from, endDate: to },
      { userId: empId, from, to },
      { userId: empId, startDate: from, endDate: to },
    ];

    let lastErr = null;
    for (const params of paramSets) {
      try {
        const res = await tryGet(paths, params);
        return normalizeRows(res);
      } catch (e) {
        lastErr = e;
        if (e?.response?.status && e.response.status !== 404) throw e;
      }
    }
    throw lastErr || new Error("Leave export failed (endpoint not found).");
  };

  // -------------------------
  // Workbook builders
  // -------------------------
  const safeSheetName = (name) => {
    const cleaned = (name || "Sheet").replace(/[:\\/?*\[\]]/g, "").trim().slice(0, 31);
    return cleaned || "Sheet";
  };

  const buildEmployeesListSheet = () => {
    const rows = (employees || []).map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      role: e.role,
      isActive: e.isActive === true || e.isActive === 1 ? "ACTIVE" : "INACTIVE",
      joiningDate: e.joiningDate || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    return { ws, name: "Employees" };
  };

  const buildPerEmployeeSheets = async ({ from, to }) => {
    const sheets = [];
    for (const emp of employees || []) {
      const empId = emp?.id;
      if (!empId) continue;

      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || `EMP_${empId}`;
      const sheetName = safeSheetName(fullName);

      let rows = [];
      if (exportType === "attendance") rows = await fetchAttendanceRows({ empId, from, to });
      else rows = await fetchLeaveRows({ empId, from, to });

      const ws = XLSX.utils.json_to_sheet((rows || []).map((r) => ({ ...r })));
      sheets.push({ ws, name: sheetName });
    }
    return sheets;
  };

  const validate = () => {
    if (!employees || employees.length === 0) return t("xlsxWorkbook.errors.noEmployees");

    if (workbookType === "perEmployeeData") {
      if (periodType === "daily" && !dailyDate) return t("xlsxWorkbook.errors.pickDaily");
      if (periodType === "monthly" && !monthValue) return t("xlsxWorkbook.errors.pickMonthly");
      if (periodType === "custom" && (!customFrom || !customTo)) return t("xlsxWorkbook.errors.pickCustom");
    }
    return "";
  };

  const handleExport = async () => {
    const msg = validate();
    if (msg) {
      setErrMsg(msg);
      return;
    }

    setErrMsg("");
    setLoading(true);

    try {
      const wb = XLSX.utils.book_new();

      const now = new Date();
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      if (workbookType === "employeesList") {
        const { ws, name } = buildEmployeesListSheet();
        XLSX.utils.book_append_sheet(wb, ws, name);
        XLSX.writeFile(wb, `employees_list_${stamp}.xlsx`);
      } else {
        const { from, to } = range;

        const summary = XLSX.utils.json_to_sheet([
          {
            exportType,
            periodType,
            from: from || "",
            to: to || "",
            employees: employees.length,
            createdAt: now.toISOString(),
          },
        ]);
        XLSX.utils.book_append_sheet(wb, summary, "Summary");

        const perSheets = await buildPerEmployeeSheets({ from, to });
        perSheets.forEach((s) => XLSX.utils.book_append_sheet(wb, s.ws, s.name));

        XLSX.writeFile(wb, `${exportType}_employees_${from || "na"}_${to || "na"}_${stamp}.xlsx`);
      }

      onClose?.();
    } catch (e) {
      setErrMsg(e?.response?.data?.message || e?.message || t("xlsxWorkbook.errors.exportFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const pickerTitle =
    pickerTarget === "daily"
      ? t("xlsxWorkbook.picker.selectDate")
      : pickerTarget === "month"
      ? t("xlsxWorkbook.picker.selectMonth")
      : pickerTarget === "year" || pickerTarget === "qyear"
      ? t("xlsxWorkbook.picker.selectYear")
      : pickerTarget === "from"
      ? t("xlsxWorkbook.picker.dateFrom")
      : pickerTarget === "to"
      ? t("xlsxWorkbook.picker.dateTo")
      : t("xlsxWorkbook.picker.select");

  const PickBtn = ({ label, value, placeholder, onClick }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <button
        type="button"
        onClick={onClick}
        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-left font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-between"
        disabled={loading}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>{value || placeholder}</span>
        <CalendarDays size={18} className="text-slate-500" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (loading) return;
          onClose?.();
        }}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-3xl rounded-[1.5rem] bg-white border border-slate-200 shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-slate-700" />
              <div>
                <div className="text-lg font-black text-slate-800">{t("xlsxWorkbook.title")}</div>
                <div className="text-xs text-slate-500 font-bold">
                  {t("xlsxWorkbook.employeesCount")} {employees?.length || 0}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (loading) return;
                onClose?.();
              }}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition disabled:opacity-60"
              aria-label={t("common.close")}
              title={t("common.close")}
              disabled={loading}
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-5">
            {/* workbook type */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">{t("xlsxWorkbook.workbookType.label")}</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "perEmployeeData", label: t("xlsxWorkbook.workbookType.perEmployee") },
                  { key: "employeesList", label: t("xlsxWorkbook.workbookType.employeesList") },
                ].map((x) => {
                  const active = workbookType === x.key;
                  return (
                    <button
                      key={x.key}
                      type="button"
                      onClick={() => setWorkbookType(x.key)}
                      className={[
                        "px-3 h-9 rounded-full border font-bold text-sm transition inline-flex items-center gap-2",
                        active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                      disabled={loading}
                    >
                      <Filter size={16} />
                      {x.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* perEmployee options */}
            {workbookType === "perEmployeeData" && (
              <>
                {/* export type */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-600">{t("xlsxWorkbook.dataType.label")}</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "attendance", label: t("xlsxWorkbook.dataType.attendance") },
                      { key: "leave", label: t("xlsxWorkbook.dataType.leave") },
                    ].map((x) => {
                      const active = exportType === x.key;
                      return (
                        <button
                          key={x.key}
                          type="button"
                          onClick={() => setExportType(x.key)}
                          className={[
                            "px-3 h-9 rounded-full border font-bold text-sm transition",
                            active
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                          ].join(" ")}
                          disabled={loading}
                        >
                          {x.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* period */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-600">{t("xlsxWorkbook.period.label")}</div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "daily", label: t("xlsxWorkbook.period.daily") },
                      { key: "monthly", label: t("xlsxWorkbook.period.monthly") },
                      { key: "yearly", label: t("xlsxWorkbook.period.yearly") },
                      { key: "quarter", label: t("xlsxWorkbook.period.quarter") },
                      { key: "custom", label: t("xlsxWorkbook.period.custom") },
                    ].map((p) => {
                      const active = periodType === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setPeriodType(p.key)}
                          className={[
                            "px-3 h-9 rounded-full border font-bold text-sm transition",
                            active
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                          ].join(" ")}
                          disabled={loading}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {periodType === "daily" && (
                      <div className="md:col-span-2">
                        <PickBtn
                          label={t("xlsxWorkbook.fields.selectDate")}
                          value={dailyDate}
                          placeholder={t("xlsxWorkbook.placeholders.pickDate")}
                          onClick={() => openPicker("daily")}
                        />
                      </div>
                    )}

                    {periodType === "monthly" && (
                      <div className="md:col-span-2">
                        <PickBtn
                          label={t("xlsxWorkbook.fields.selectMonth")}
                          value={monthValue}
                          placeholder={t("xlsxWorkbook.placeholders.pickMonth")}
                          onClick={() => openPicker("month")}
                        />
                      </div>
                    )}

                    {periodType === "yearly" && (
                      <div className="md:col-span-2">
                        <PickBtn
                          label={t("xlsxWorkbook.fields.selectYear")}
                          value={String(yearValue || "")}
                          placeholder={t("xlsxWorkbook.placeholders.pickYear")}
                          onClick={() => openPicker("year")}
                        />
                      </div>
                    )}

                    {periodType === "quarter" && (
                      <>
                        <PickBtn
                          label={t("xlsxWorkbook.fields.year")}
                          value={String(quarterYear || "")}
                          placeholder={t("xlsxWorkbook.placeholders.pickYear")}
                          onClick={() => openPicker("qyear")}
                        />

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">
                            {t("xlsxWorkbook.fields.quarter")}
                          </label>
                          <select
                            value={quarterValue}
                            onChange={(e) => setQuarterValue(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
                            disabled={loading}
                          >
                            <option value="Q1">{t("xlsxWorkbook.quarters.q1")}</option>
                            <option value="Q2">{t("xlsxWorkbook.quarters.q2")}</option>
                            <option value="Q3">{t("xlsxWorkbook.quarters.q3")}</option>
                            <option value="Q4">{t("xlsxWorkbook.quarters.q4")}</option>
                          </select>
                        </div>
                      </>
                    )}

                    {periodType === "custom" && (
                      <>
                        <PickBtn
                          label={t("xlsxWorkbook.fields.dateFrom")}
                          value={customFrom}
                          placeholder={t("xlsxWorkbook.placeholders.pickStart")}
                          onClick={() => openPicker("from")}
                        />
                        <PickBtn
                          label={t("xlsxWorkbook.fields.dateTo")}
                          value={customTo}
                          placeholder={t("xlsxWorkbook.placeholders.pickEnd")}
                          onClick={() => openPicker("to")}
                        />
                      </>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    {t("xlsxWorkbook.rangeLabel")}{" "}
                    <span className="font-bold text-slate-700">
                      {range.from || "-"} → {range.to || "-"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {errMsg && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-bold">
                {errMsg}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (loading) return;
                onClose?.();
              }}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
              disabled={loading}
            >
              {t("common.cancel")}
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="h-10 px-5 rounded-full bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-[0.98] transition inline-flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              {t("xlsxWorkbook.buttons.exportXlsx")}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ DateGridPicker เป็น modal ซ้อน modal (ต้องอยู่ท้ายสุด + z สูง) */}
      <div className="relative z-[100000]">
        <DateGridPicker
          open={pickerOpen}
          granularity={pickerGranularity}
          allowAll={false}
          value={pickerValue}
          onChange={handlePickerChange}
          onClose={closePicker}
          title={pickerTitle}
        />
      </div>
    </div>
  );
}
