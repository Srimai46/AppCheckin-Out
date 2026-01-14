// frontend/src/pages/csv/csvforAuditLog.jsx
import { useMemo, useState } from "react";
import { Download, Filter, X } from "lucide-react";
import DateGridPicker from "../../components/shared/DateGridPicker";

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - logs: audit log array (same shape as your current logs)
 */
export default function CsvForAuditLog({ open, onClose, logs = [] }) {
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

  const toDateOnly = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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
    setFActions((prev) =>
      prev.includes(act) ? prev.filter((x) => x !== act) : [...prev, act]
    );
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
              <h2 className="text-lg font-black text-slate-800">Export CSV Filters</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-5">
            {/* Period selector */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">Period</div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: "daily", label: "Daily" },
                  { key: "monthly", label: "Monthly" },
                  { key: "yearly", label: "Yearly" },
                  { key: "quarter", label: "Quarter" },
                  { key: "custom", label: "Custom range" },
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
                    <label className="text-xs font-bold text-slate-600">Select date</label>
                    <input
                      readOnly
                      value={dailyDate}
                      onClick={() => openPicker("daily")}
                      placeholder="YYYY-MM-DD"
                      className={readonlyPickerInputClass}
                    />
                  </div>
                )}

                {periodType === "monthly" && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600">Select month</label>
                    <input
                      readOnly
                      value={monthValue}
                      onClick={() => openPicker("month")}
                      placeholder="YYYY-MM"
                      className={readonlyPickerInputClass}
                    />
                  </div>
                )}

                {periodType === "yearly" && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600">Select year</label>
                    <input
                      readOnly
                      value={yearValue}
                      onClick={() => openPicker("year")}
                      placeholder="YYYY"
                      className={readonlyPickerInputClass}
                    />
                  </div>
                )}

                {periodType === "quarter" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Year</label>
                      <input
                        readOnly
                        value={quarterYear}
                        onClick={() => openPicker("qYear")}
                        placeholder="YYYY"
                        className={readonlyPickerInputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Quarter</label>
                      <select
                        value={quarterValue}
                        onChange={(e) => setQuarterValue(e.target.value)}
                        className={inputClass}
                      >
                        <option value="Q1">Q1 (Jan–Mar)</option>
                        <option value="Q2">Q2 (Apr–Jun)</option>
                        <option value="Q3">Q3 (Jul–Sep)</option>
                        <option value="Q4">Q4 (Oct–Dec)</option>
                      </select>
                    </div>
                  </>
                )}

                {periodType === "custom" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Date from</label>
                      <input
                        readOnly
                        value={customFrom}
                        onClick={() => openPicker("from")}
                        placeholder="YYYY-MM-DD"
                        className={readonlyPickerInputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Date to</label>
                      <input
                        readOnly
                        value={customTo}
                        onClick={() => openPicker("to")}
                        placeholder="YYYY-MM-DD"
                        className={readonlyPickerInputClass}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Range:{" "}
                <span className="font-bold text-slate-700">
                  {from || "-"} → {to || "-"}
                </span>
              </div>
            </div>

            {/* Other filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Model</label>
                <select
                  value={fModel}
                  onChange={(e) => setFModel(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Performed by</label>
                <select value={fUser} onChange={(e) => setFUser(e.target.value)} className={inputClass}>
                  <option value="all">All</option>
                  {userOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-600">Keyword (details)</label>
                <input
                  value={fKeyword}
                  onChange={(e) => setFKeyword(e.target.value)}
                  placeholder='เช่น "Late", "Approved", "withdraw"...'
                  className={inputClass}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-600">Record ID (optional)</label>
                <input
                  value={fRecordId}
                  onChange={(e) => setFRecordId(e.target.value)}
                  placeholder="เช่น 6 หรือ 10"
                  className={inputClass}
                />
              </div>
            </div>

            {/* actions multi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">Actions (multi-select)</label>
                <button
                  type="button"
                  onClick={() => setFActions([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Clear actions
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {actionOptions.length === 0 ? (
                  <div className="text-sm text-slate-400 italic">No actions loaded yet</div>
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
                Rows to export: <span className="font-black">{filteredRows.length}</span>
              </div>
              <button
                type="button"
                onClick={resetAll}
                className="text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                Reset
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
              Cancel
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="h-10 px-5 rounded-full bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-[0.98] transition inline-flex items-center gap-2"
            >
              <Download size={18} />
              Export
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
        title={
          pickerField === "daily"
            ? "Select date"
            : pickerField === "month"
            ? "Select month"
            : pickerField === "year" || pickerField === "qYear"
            ? "Select year"
            : pickerField === "from"
            ? "Date from"
            : pickerField === "to"
            ? "Date to"
            : "Select date"
        }
        allowAll={false}
        granularity={pickerGranularity} // "day" | "month" | "year"
      />
    </div>
  );
}
