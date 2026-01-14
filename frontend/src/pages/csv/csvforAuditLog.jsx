// frontend/src/pages/csv/csvforAuditLog.jsx
import { useMemo, useState } from "react";
import { Download, Filter, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import DateGridPicker from "../../components/shared/DateGridPicker";

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - logs: audit log array (same shape as your current logs)
 */
export default function CsvForAuditLog({ open, onClose, logs = [] }) {
  const { t } = useTranslation();

  // -------------------------
  // Period Filter
  // -------------------------
  const [periodType, setPeriodType] = useState("daily"); // daily | monthly | yearly | quarter | custom

  // daily
  const [dailyDate, setDailyDate] = useState(""); // yyyy-mm-dd

  // monthly
  const [monthValue, setMonthValue] = useState(""); // yyyy-mm

  // yearly
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear())); // keep as string yyyy

  // quarter
  const [quarterYear, setQuarterYear] = useState(String(new Date().getFullYear())); // yyyy string
  const [quarterValue, setQuarterValue] = useState("Q1"); // Q1..Q4

  // custom
  const [customFrom, setCustomFrom] = useState(""); // yyyy-mm-dd
  const [customTo, setCustomTo] = useState(""); // yyyy-mm-dd

  // -------------------------
  // DateGridPicker controller
  // -------------------------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerField, setPickerField] = useState(null); // 'daily' | 'month' | 'year' | 'qYear' | 'from' | 'to'

  const openPicker = (field) => {
    setPickerField(field);
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPickerField(null);
  };

  const pickerGranularity =
    pickerField === "year" || pickerField === "qYear"
      ? "year"
      : pickerField === "month"
      ? "month"
      : "day";

  const pickerValue = useMemo(() => {
    if (!pickerField) return "";
    if (pickerField === "daily") return dailyDate || "";
    if (pickerField === "month") return monthValue || "";
    if (pickerField === "year") return yearValue || "";
    if (pickerField === "qYear") return quarterYear || "";
    if (pickerField === "from") return customFrom || "";
    if (pickerField === "to") return customTo || "";
    return "";
  }, [pickerField, dailyDate, monthValue, yearValue, quarterYear, customFrom, customTo]);

  const handlePickerChange = (val) => {
    // val will be: null (all) OR "yyyy" OR "yyyy-mm" OR "yyyy-mm-dd"
    const v = val == null ? "" : String(val);

    if (pickerField === "daily") setDailyDate(v);
    else if (pickerField === "month") setMonthValue(v);
    else if (pickerField === "year") setYearValue(v);
    else if (pickerField === "qYear") setQuarterYear(v);
    else if (pickerField === "from") setCustomFrom(v);
    else if (pickerField === "to") setCustomTo(v);

    closePicker();
  };

  // -------------------------
  // Other Filters
  // -------------------------
  const [fActions, setFActions] = useState([]); // multi
  const [fModel, setFModel] = useState("all");
  const [fUser, setFUser] = useState("all");
  const [fKeyword, setFKeyword] = useState("");
  const [fRecordId, setFRecordId] = useState("");

  // -------------------------
  // Options from logs
  // -------------------------
  const actionOptions = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => l?.action && s.add(l.action));
    return Array.from(s).sort();
  }, [logs]);

  const modelOptions = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => l?.modelName && s.add(l.modelName));
    return Array.from(s).sort();
  }, [logs]);

  const userOptions = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => {
      const name = l?.performedBy
        ? `${l.performedBy.firstName} ${l.performedBy.lastName || ""}`.trim()
        : "SYSTEM";
      s.add(name || "SYSTEM");
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  // -------------------------
  // Helpers
  // -------------------------
  const pad = (n) => String(n).padStart(2, "0");

  const toDateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const startOfMonth = (yyyyMm) => {
    if (!yyyyMm) return "";
    const [y, m] = yyyyMm.split("-").map((x) => parseInt(x, 10));
    const d = new Date(y, m - 1, 1);
    return toDateOnly(d);
  };

  const endOfMonth = (yyyyMm) => {
    if (!yyyyMm) return "";
    const [y, m] = yyyyMm.split("-").map((x) => parseInt(x, 10));
    const d = new Date(y, m, 0);
    return toDateOnly(d);
  };

  const buildPeriodRange = () => {
    if (periodType === "daily") {
      return { from: dailyDate || "", to: dailyDate || "" };
    }

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
      const q = quarterValue;
      if (!y || Number.isNaN(y)) return { from: "", to: "" };

      const map = {
        Q1: { from: `${y}-01-01`, to: `${y}-03-31` },
        Q2: { from: `${y}-04-01`, to: `${y}-06-30` },
        Q3: { from: `${y}-07-01`, to: `${y}-09-30` },
        Q4: { from: `${y}-10-01`, to: `${y}-12-31` },
      };
      return map[q] || { from: "", to: "" };
    }

    return { from: customFrom || "", to: customTo || "" };
  };

  const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

  const toggleAction = (act) => {
    setFActions((prev) => (prev.includes(act) ? prev.filter((x) => x !== act) : [...prev, act]));
  };

  const resetAll = () => {
    setPeriodType("daily");
    setDailyDate("");
    setMonthValue("");
    setYearValue(String(new Date().getFullYear()));
    setQuarterYear(String(new Date().getFullYear()));
    setQuarterValue("Q1");
    setCustomFrom("");
    setCustomTo("");

    setFActions([]);
    setFModel("all");
    setFUser("all");
    setFKeyword("");
    setFRecordId("");
  };

  // -------------------------
  // Filtered rows for export
  // -------------------------
  const filteredRows = useMemo(() => {
    const { from, to } = buildPeriodRange();
    const kw = normalize(fKeyword);
    const rid = normalize(fRecordId);

    return logs.filter((l) => {
      const created = l?.createdAt ? new Date(l.createdAt) : null;
      const createdDate = created ? toDateOnly(created) : "";

      if (from && createdDate && createdDate < from) return false;
      if (to && createdDate && createdDate > to) return false;

      if (fActions.length > 0 && !fActions.includes(l.action)) return false;

      if (fModel !== "all" && l.modelName !== fModel) return false;

      const name = l?.performedBy
        ? `${l.performedBy.firstName} ${l.performedBy.lastName || ""}`.trim()
        : "SYSTEM";
      if (fUser !== "all" && (name || "SYSTEM") !== fUser) return false;

      if (kw) {
        const hay = `${l.action} ${l.modelName} ${l.recordId} ${l.details}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }

      if (rid) {
        const r = normalize(l.recordId);
        if (!r.includes(rid)) return false;
      }

      return true;
    });
  }, [
    logs,
    periodType,
    dailyDate,
    monthValue,
    yearValue,
    quarterYear,
    quarterValue,
    customFrom,
    customTo,
    fActions,
    fModel,
    fUser,
    fKeyword,
    fRecordId,
  ]);

  // -------------------------
  // CSV builders
  // -------------------------
  const escapeCsv = (value) => {
    const s = (value ?? "").toString();
    return `"${s.replace(/"/g, '""')}"`;
  };

  const buildCsv = (rows) => {
    const header = ["createdAt", "action", "modelName", "recordId", "details", "performedBy"];

    const lines = rows.map((l) => {
      const createdText = l?.createdAt ? new Date(l.createdAt).toISOString() : "";
      const performedBy = l?.performedBy
        ? `${l.performedBy.firstName} ${l.performedBy.lastName || ""}`.trim()
        : "SYSTEM";

      return [
        escapeCsv(createdText),
        escapeCsv(l.action),
        escapeCsv(l.modelName),
        escapeCsv(l.recordId),
        escapeCsv(l.details),
        escapeCsv(performedBy),
      ].join(",");
    });

    return [header.join(","), ...lines].join("\n");
  };

  const downloadCsv = () => {
    const csv = buildCsv(filteredRows);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const fileName = `audit_logs_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    onClose?.();
  };

  if (!open) return null;

  const { from, to } = buildPeriodRange();

  const inputClass =
    "w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 bg-white";

  const readonlyPickerInputClass =
    "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold cursor-pointer focus:ring-2 focus:ring-slate-200 outline-none";

  const pickerTitle = (() => {
    if (pickerField === "daily") return t("auditLogExport.picker.selectDate");
    if (pickerField === "month") return t("auditLogExport.picker.selectMonth");
    if (pickerField === "year" || pickerField === "qYear") return t("auditLogExport.picker.selectYear");
    if (pickerField === "from") return t("auditLogExport.picker.dateFrom");
    if (pickerField === "to") return t("auditLogExport.picker.dateTo");
    return t("auditLogExport.picker.selectDate");
  })();

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-[1.5rem] bg-white border border-slate-200 shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-700" />
              <h2 className="text-lg font-black text-slate-800">
                {t("auditLogExport.title")}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition"
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-5">
            {/* Period selector */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">
                {t("auditLogExport.period.label")}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: "daily", label: t("auditLogExport.period.daily") },
                  { key: "monthly", label: t("auditLogExport.period.monthly") },
                  { key: "yearly", label: t("auditLogExport.period.yearly") },
                  { key: "quarter", label: t("auditLogExport.period.quarter") },
                  { key: "custom", label: t("auditLogExport.period.customRange") },
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
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* period inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {periodType === "daily" && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600">
                      {t("auditLogExport.period.selectDate")}
                    </label>
                    <input
                      readOnly
                      value={dailyDate}
                      onClick={() => openPicker("daily")}
                      placeholder={t("auditLogExport.placeholders.date")}
                      className={readonlyPickerInputClass}
                    />
                  </div>
                )}

                {periodType === "monthly" && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600">
                      {t("auditLogExport.period.selectMonth")}
                    </label>
                    <input
                      readOnly
                      value={monthValue}
                      onClick={() => openPicker("month")}
                      placeholder={t("auditLogExport.placeholders.month")}
                      className={readonlyPickerInputClass}
                    />
                  </div>
                )}

                {periodType === "yearly" && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600">
                      {t("auditLogExport.period.selectYear")}
                    </label>
                    <input
                      readOnly
                      value={yearValue}
                      onClick={() => openPicker("year")}
                      placeholder={t("auditLogExport.placeholders.year")}
                      className={readonlyPickerInputClass}
                    />
                  </div>
                )}

                {periodType === "quarter" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">
                        {t("auditLogExport.quarter.year")}
                      </label>
                      <input
                        readOnly
                        value={quarterYear}
                        onClick={() => openPicker("qYear")}
                        placeholder={t("auditLogExport.placeholders.year")}
                        className={readonlyPickerInputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">
                        {t("auditLogExport.quarter.quarter")}
                      </label>

                      <select
                        value={quarterValue}
                        onChange={(e) => setQuarterValue(e.target.value)}
                        className={inputClass}
                      >
                        <option value="Q1">{t("auditLogExport.quarter.q1")}</option>
                        <option value="Q2">{t("auditLogExport.quarter.q2")}</option>
                        <option value="Q3">{t("auditLogExport.quarter.q3")}</option>
                        <option value="Q4">{t("auditLogExport.quarter.q4")}</option>
                      </select>
                    </div>
                  </>
                )}

                {periodType === "custom" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">
                        {t("auditLogExport.custom.dateFrom")}
                      </label>
                      <input
                        readOnly
                        value={customFrom}
                        onClick={() => openPicker("from")}
                        placeholder={t("auditLogExport.placeholders.date")}
                        className={readonlyPickerInputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">
                        {t("auditLogExport.custom.dateTo")}
                      </label>
                      <input
                        readOnly
                        value={customTo}
                        onClick={() => openPicker("to")}
                        placeholder={t("auditLogExport.placeholders.date")}
                        className={readonlyPickerInputClass}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs text-slate-500">
                {t("auditLogExport.range.label")}{" "}
                <span className="font-bold text-slate-700">
                  {from || "-"} {t("auditLogExport.range.to")} {to || "-"}
                </span>
              </div>
            </div>

            {/* Other filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  {t("auditLogExport.filters.model")}
                </label>
                <select
                  value={fModel}
                  onChange={(e) => setFModel(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">{t("auditLogExport.common.all")}</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  {t("auditLogExport.filters.performedBy")}
                </label>
                <select
                  value={fUser}
                  onChange={(e) => setFUser(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">{t("auditLogExport.common.all")}</option>
                  {userOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-600">
                  {t("auditLogExport.filters.keyword")}
                </label>
                <input
                  value={fKeyword}
                  onChange={(e) => setFKeyword(e.target.value)}
                  placeholder={t("auditLogExport.placeholders.keyword")}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-600">
                  {t("auditLogExport.filters.recordId")}
                </label>
                <input
                  value={fRecordId}
                  onChange={(e) => setFRecordId(e.target.value)}
                  placeholder={t("auditLogExport.placeholders.recordId")}
                  className={inputClass}
                />
              </div>
            </div>

            {/* actions multi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">
                  {t("auditLogExport.filters.actions")}
                </label>
                <button
                  type="button"
                  onClick={() => setFActions([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  {t("auditLogExport.actions.clearActions")}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {actionOptions.length === 0 ? (
                  <div className="text-sm text-slate-400 italic">
                    {t("auditLogExport.actions.noActions")}
                  </div>
                ) : (
                  actionOptions.map((act) => {
                    const active = fActions.includes(act);
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => toggleAction(act)}
                        className={[
                          "px-3 h-9 rounded-full border font-bold text-sm transition",
                          active
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {act}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* preview count */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-700">
                {t("auditLogExport.preview.rowsToExport")}{" "}
                <span className="font-black">{filteredRows.length}</span>
              </div>
              <button
                type="button"
                onClick={resetAll}
                className="text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                {t("auditLogExport.common.reset")}
              </button>
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="h-10 px-5 rounded-full bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-[0.98] transition inline-flex items-center gap-2"
            >
              <Download size={18} />
              {t("auditLogExport.buttons.export")}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ DateGridPicker modal (one shared instance) */}
      <DateGridPicker
        open={pickerOpen}
        value={pickerValue}
        onChange={handlePickerChange}
        onClose={closePicker}
        title={pickerTitle}
        allowAll={false}
        granularity={pickerGranularity} // "day" | "month" | "year"
      />
    </div>
  );
}
