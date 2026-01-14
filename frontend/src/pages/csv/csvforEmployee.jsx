// frontend/src/pages/csv/csvforEmployee.jsx
import { useMemo, useState } from "react";
import { Download, Filter, X, Loader2, FileText } from "lucide-react";
import api from "../../api/axios";
import DateGridPicker from "../../components/shared/DateGridPicker";

export default function CsvForEmployee({ open, onClose, employee }) {
  // =========================
  // Period Filter
  // =========================
  const [periodType, setPeriodType] = useState("monthly"); // daily | monthly | yearly | quarter | custom

  // daily (yyyy-mm-dd)  -> "" = All
  const [dailyDate, setDailyDate] = useState("");

  // monthly (yyyy-mm)   -> "" = All
  const [monthValue, setMonthValue] = useState("");

  // yearly (yyyy)       -> "" = All
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()));

  // quarter
  const [quarterYear, setQuarterYear] = useState(String(new Date().getFullYear())); // "" = All
  const [quarterValue, setQuarterValue] = useState("Q1");

  // custom (yyyy-mm-dd) -> "" = All (ถ้าจะบังคับค่อย validate)
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // export type
  const [exportType, setExportType] = useState("attendance"); // attendance | leave

  // ui
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // =========================
  // DateGridPicker Open States
  // =========================
  const [pickDailyOpen, setPickDailyOpen] = useState(false);
  const [pickMonthOpen, setPickMonthOpen] = useState(false);
  const [pickYearOpen, setPickYearOpen] = useState(false);
  const [pickQuarterYearOpen, setPickQuarterYearOpen] = useState(false);
  const [pickCustomFromOpen, setPickCustomFromOpen] = useState(false);
  const [pickCustomToOpen, setPickCustomToOpen] = useState(false);

  // =========================
  // Helpers
  // =========================
  const pad = (n) => String(n).padStart(2, "0");

  const toDateOnly = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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

  // ===== Range (รองรับ All)
  const range = useMemo(() => {
    // All => from/to = ""
    if (periodType === "daily") {
      if (!dailyDate) return { from: "", to: "" };
      return { from: dailyDate, to: dailyDate };
    }

    if (periodType === "monthly") {
      if (!monthValue) return { from: "", to: "" };
      return { from: startOfMonth(monthValue), to: endOfMonth(monthValue) };
    }

    if (periodType === "yearly") {
      const y = Number(yearValue);
      if (!yearValue || !y || Number.isNaN(y)) return { from: "", to: "" };
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }

    if (periodType === "quarter") {
      const y = Number(quarterYear);
      if (!quarterYear || !y || Number.isNaN(y)) return { from: "", to: "" };

      const map = {
        Q1: { from: `${y}-01-01`, to: `${y}-03-31` },
        Q2: { from: `${y}-04-01`, to: `${y}-06-30` },
        Q3: { from: `${y}-07-01`, to: `${y}-09-30` },
        Q4: { from: `${y}-10-01`, to: `${y}-12-31` },
      };
      return map[quarterValue] || { from: "", to: "" };
    }

    // custom
    if (!customFrom || !customTo) return { from: "", to: "" };
    return { from: customFrom, to: customTo };
  }, [periodType, dailyDate, monthValue, yearValue, quarterYear, quarterValue, customFrom, customTo]);

  // =========================
  // CSV helpers
  // =========================
  const escapeCsv = (value) => {
    const s = (value ?? "").toString();
    return `"${s.replace(/"/g, '""')}"`;
  };

  const downloadBlob = (csvText, filename) => {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // =========================
  // API Fetchers (รองรับหลาย endpoint + หลาย params กัน 404)
  // =========================
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
        const status = e?.response?.status;
        if (status === 404) continue;
        throw e;
      }
    }
    throw lastErr || new Error("No matching API endpoint (all paths returned 404).");
  };

  const fetchAttendanceRows = async ({ empId, from, to }) => {
    const paths = [
      "/attendance/records",
      "/attendance/record",
      "/attendance/time-records",
      "/attendance/timerecords",
      "/time-records",
      "/timerecords",
      "/attendance/history",
      "/attendance",
    ];

    const paramSets = [
      { employeeId: empId, from, to },
      { employeeId: empId, startDate: from, endDate: to },
      { empId, from, to },
      { empId, startDate: from, endDate: to },
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
    const paths = [
      "/leave/requests",
      "/leave/request",
      "/leave/history",
      "/leave",
      "/leave-requests",
      "/leaves/requests",
      "/leaves",
    ];

    const paramSets = [
      { employeeId: empId, from, to },
      { employeeId: empId, startDate: from, endDate: to },
      { empId, from, to },
      { empId, startDate: from, endDate: to },
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

  // =========================
  // CSV Builders
  // =========================
  const buildAttendanceCsv = (rows) => {
    const header = [
      "employeeId",
      "fullName",
      "email",
      "role",
      "date",
      "checkInTime",
      "checkOutTime",
      "checkInStatus",
      "checkOutStatus",
      "lateMinutes",
      "earlyLeaveMinutes",
      "totalHours",
      "location",
      "note",
      "timeRecordId",
    ];

    const fullName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();

    const lines = rows.map((r) =>
      [
        escapeCsv(employee?.id),
        escapeCsv(fullName),
        escapeCsv(employee?.email),
        escapeCsv(employee?.role),
        escapeCsv(r.date || r.workDate || ""),
        escapeCsv(r.checkInTime || r.checkIn || ""),
        escapeCsv(r.checkOutTime || r.checkOut || ""),
        escapeCsv(r.checkInStatus || ""),
        escapeCsv(r.checkOutStatus || ""),
        escapeCsv(r.lateMinutes ?? ""),
        escapeCsv(r.earlyLeaveMinutes ?? ""),
        escapeCsv(r.totalHours ?? r.workHours ?? ""),
        escapeCsv(r.location || ""),
        escapeCsv(r.note || r.remark || ""),
        escapeCsv(r.id || r.timeRecordId || ""),
      ].join(",")
    );

    return [header.join(","), ...lines].join("\n");
  };

  const buildLeaveCsv = (rows) => {
    const header = [
      "leaveRequestId",
      "employeeId",
      "fullName",
      "email",
      "role",
      "leaveType",
      "startDate",
      "endDate",
      "startDuration",
      "endDuration",
      "totalDays",
      "status",
      "reason",
      "submittedAt",
      "decidedAt",
      "decidedBy",
      "rejectReason",
    ];

    const fullName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();

    const lines = rows.map((r) => {
      const decidedBy = r?.decidedBy
        ? `${r.decidedBy.firstName || ""} ${r.decidedBy.lastName || ""}`.trim()
        : r?.approvedByName || "";

      return [
        escapeCsv(r.id || r.leaveRequestId || ""),
        escapeCsv(employee?.id),
        escapeCsv(fullName),
        escapeCsv(employee?.email),
        escapeCsv(employee?.role),
        escapeCsv(r.type || r.leaveType || ""),
        escapeCsv(r.startDate || ""),
        escapeCsv(r.endDate || ""),
        escapeCsv(r.startDuration || ""),
        escapeCsv(r.endDuration || ""),
        escapeCsv(r.totalDays ?? r.days ?? ""),
        escapeCsv(r.status || ""),
        escapeCsv(r.reason || ""),
        escapeCsv(r.createdAt || r.submittedAt || ""),
        escapeCsv(r.decidedAt || r.updatedAt || ""),
        escapeCsv(decidedBy),
        escapeCsv(r.rejectReason || ""),
      ].join(",");
    });

    return [header.join(","), ...lines].join("\n");
  };

  // ✅ เปลี่ยนเงื่อนไข validate ให้รองรับ "All"
  const validateRange = () => {
    if (!employee?.id) return "ไม่พบข้อมูลพนักงาน";

    // daily/monthly: อนุญาตให้เป็น All ได้ (ค่าว่าง)
    // yearly/quarter: อนุญาต All ได้เช่นกัน
    if (periodType === "custom") {
      // custom ถ้าจะใช้ ต้องใส่ครบ (ถ้าต้องการให้ custom มี All ด้วย ให้ลบส่วนนี้)
      if (!customFrom || !customTo) return "กรุณาเลือกวันเริ่มต้น-วันสิ้นสุด (Custom) ให้ครบ";
    }

    return "";
  };

  const handleExport = async () => {
    const msg = validateRange();
    if (msg) {
      setErrMsg(msg);
      return;
    }

    setErrMsg("");
    setLoading(true);

    try {
      const empId = employee.id;
      const { from, to } = range;

      const safeName =
        `${employee?.firstName || ""}_${employee?.lastName || ""}`.trim() || `emp_${empId}`;
      const now = new Date();
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      if (exportType === "attendance") {
        const rows = await fetchAttendanceRows({ empId, from, to });
        const csv = buildAttendanceCsv(rows);
        downloadBlob(csv, `attendance_${safeName}_${from || "all"}_${to || "all"}_${stamp}.csv`);
      } else {
        const rows = await fetchLeaveRows({ empId, from, to });
        const csv = buildLeaveCsv(rows);
        downloadBlob(csv, `leave_${safeName}_${from || "all"}_${to || "all"}_${stamp}.csv`);
      }

      onClose?.();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        setErrMsg(
          "Export ไม่สำเร็จ: Backend ไม่มี endpoint ที่รองรับ (404). กรุณาเช็คเส้น API จริงใน backend แล้วปรับ paths ในไฟล์นี้"
        );
      } else {
        setErrMsg(e?.response?.data?.message || e?.message || "Export failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const fullName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();

  // ====== UI helper field (กดแล้วเปิด picker)
  const PickField = ({ label, valueText, placeholder = "All", onClick }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={[
          "w-full h-11 px-4 rounded-xl border border-slate-200 bg-white",
          "text-left font-bold text-slate-800",
          "hover:bg-slate-50 transition",
          "disabled:opacity-60",
        ].join(" ")}
      >
        <span className={valueText ? "text-slate-800" : "text-slate-400"}>
          {valueText || placeholder}
        </span>
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-[1.5rem] bg-white border border-slate-200 shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-700" />
              <div>
                <div className="text-lg font-black text-slate-800">Export CSV (Employee)</div>
                <div className="text-xs text-slate-500 font-bold">
                  {fullName} • #{employee?.id}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition"
              aria-label="Close"
              disabled={loading}
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-5">
            {/* export type */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">Export type</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "attendance", label: "Attendance", icon: Download },
                  { key: "leave", label: "Leave Requests", icon: FileText },
                ].map((x) => {
                  const active = exportType === x.key;
                  const Icon = x.icon;
                  return (
                    <button
                      key={x.key}
                      type="button"
                      onClick={() => setExportType(x.key)}
                      className={[
                        "px-3 h-9 rounded-full border font-bold text-sm transition inline-flex items-center gap-2",
                        active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                      disabled={loading}
                    >
                      <Icon size={16} />
                      {x.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* period */}
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
                    <PickField
                      label="Select date"
                      valueText={dailyDate}
                      placeholder="All"
                      onClick={() => setPickDailyOpen(true)}
                    />
                  </div>
                )}

                {periodType === "monthly" && (
                  <div className="md:col-span-2">
                    <PickField
                      label="Select month"
                      valueText={monthValue}
                      placeholder="All"
                      onClick={() => setPickMonthOpen(true)}
                    />
                  </div>
                )}

                {periodType === "yearly" && (
                  <div className="md:col-span-2">
                    <PickField
                      label="Select year"
                      valueText={yearValue}
                      placeholder="All"
                      onClick={() => setPickYearOpen(true)}
                    />
                  </div>
                )}

                {periodType === "quarter" && (
                  <>
                    <div className="md:col-span-2">
                      <PickField
                        label="Year"
                        valueText={quarterYear}
                        placeholder="All"
                        onClick={() => setPickQuarterYearOpen(true)}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-600">Quarter</label>
                      <select
                        value={quarterValue}
                        onChange={(e) => setQuarterValue(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
                        disabled={loading}
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
                    <PickField
                      label="Date from"
                      valueText={customFrom}
                      placeholder="Pick date"
                      onClick={() => setPickCustomFromOpen(true)}
                    />
                    <PickField
                      label="Date to"
                      valueText={customTo}
                      placeholder="Pick date"
                      onClick={() => setPickCustomToOpen(true)}
                    />
                  </>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Range:{" "}
                <span className="font-bold text-slate-700">
                  {range.from || "all"} → {range.to || "all"}
                </span>
              </div>
            </div>

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
              onClick={onClose}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="h-10 px-5 rounded-full bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-[0.98] transition inline-flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              Export
            </button>
          </div>
        </div>
      </div>

      {/* =========================
          DateGridPicker Modals
         ========================= */}

      {/* DAILY */}
      <DateGridPicker
        open={pickDailyOpen}
        title="Select date"
        allowAll={true}
        granularity="day"
        value={dailyDate || null}
        onChange={(v) => setDailyDate(v || "")}
        onClose={() => setPickDailyOpen(false)}
      />

      {/* MONTH */}
      <DateGridPicker
        open={pickMonthOpen}
        title="Select month"
        allowAll={true}
        granularity="month"
        value={monthValue || null}
        onChange={(v) => setMonthValue(v || "")}
        onClose={() => setPickMonthOpen(false)}
      />

      {/* YEAR */}
      <DateGridPicker
        open={pickYearOpen}
        title="Select year"
        allowAll={true}
        granularity="year"
        value={yearValue || null}
        onChange={(v) => setYearValue(v || "")}
        onClose={() => setPickYearOpen(false)}
      />

      {/* QUARTER YEAR */}
      <DateGridPicker
        open={pickQuarterYearOpen}
        title="Select year"
        allowAll={true}
        granularity="year"
        value={quarterYear || null}
        onChange={(v) => setQuarterYear(v || "")}
        onClose={() => setPickQuarterYearOpen(false)}
      />

      {/* CUSTOM FROM */}
      <DateGridPicker
        open={pickCustomFromOpen}
        title="Date from"
        allowAll={false}
        granularity="day"
        value={customFrom || null}
        onChange={(v) => setCustomFrom(v || "")}
        onClose={() => setPickCustomFromOpen(false)}
      />

      {/* CUSTOM TO */}
      <DateGridPicker
        open={pickCustomToOpen}
        title="Date to"
        allowAll={false}
        granularity="day"
        value={customTo || null}
        onChange={(v) => setCustomTo(v || "")}
        onClose={() => setPickCustomToOpen(false)}
      />
    </div>
  );
}
