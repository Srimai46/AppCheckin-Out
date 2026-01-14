import React, { useEffect, useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import thLocale from "date-fns/locale/th";
import enUS from "date-fns/locale/en-US";
import { useTranslation } from "react-i18next";
import { Filter, X, CalendarDays, Loader2, ChevronDown } from "lucide-react";
import DateGridPicker from "../../components/shared/DateGridPicker";

// ✅ 1. นำ Cache และ Helper functions กลับมาไว้ด้านนอก
const leaveTypesCache = {}; 

const parseLabel = (label, lang, fallback) => {
  if (label == null) return fallback;
  try {
    const parsed = typeof label === "string" ? JSON.parse(label) : label;
    return parsed?.[lang] || parsed?.th || parsed?.en || fallback;
  } catch {
    return String(label);
  }
};

export default function CsvForTeamCalendar({
  leaves = [],
  currentDate = new Date(),
  useCookieAuth = false,
  getAuthToken = null,
}) {
  const { i18n, t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("MONTH");
  const [month, setMonth] = useState(format(currentDate, "MM"));
  const [year, setYear] = useState(format(currentDate, "yyyy"));

  // ✅ 2. นำ State ของ Leave Types กลับมาครบชุด
  const [leaveTypeFilters, setLeaveTypeFilters] = useState([]);
  const [types, setTypes] = useState([]); // selected typeNames
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState(null);
  const [openTypesDropdown, setOpenTypesDropdown] = useState(false);

  const typesBtnRef = useRef(null);
  const typesDropdownRef = useRef(null);

  // DateGridPicker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); 

  // ✅ 3. นำฟังก์ชัน Auth กลับมา
  const defaultGetAuthToken = () => {
    try { return localStorage.getItem("token"); } catch { return null; }
  };

  const buildFetchOptions = () => {
    if (useCookieAuth) {
      return { method: "GET", credentials: "include", headers: { "Content-Type": "application/json" } };
    }
    const token = typeof getAuthToken === "function" ? getAuthToken() : defaultGetAuthToken();
    return {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  };

  // ✅ 4. นำฟังก์ชัน fetchLeaveTypes กลับมาแบบจัดเต็ม
  const fetchLeaveTypes = async ({ forceReload = false } = {}) => {
    setTypesLoading(true);
    setTypesError(null);
    const lang = i18n.language || "en";

    if (!forceReload && leaveTypesCache[lang]?.length > 0) {
      setLeaveTypeFilters(leaveTypesCache[lang]);
      setTypesLoading(false);
      return;
    }

    try {
      const opts = buildFetchOptions();
      const res = await fetch("/api/leaves/types", opts);
      if (!res.ok) throw new Error(`Failed to load leave types (${res.status})`);

      const data = await res.json();
      const mapped = (data || []).map((row, idx) => {
        const typeName = row.typeName || row.type_name || row.type || `TYPE_${idx}`;
        const label = parseLabel(row.label, i18n.language, typeName);
        return { id: row.id ?? idx, typeName, label };
      });

      leaveTypesCache[lang] = mapped;
      setLeaveTypeFilters(mapped);
    } catch (err) {
      setTypesError(err.message || "Failed to load leave types");
    } finally {
      setTypesLoading(false);
    }
  };

  // ✅ 5. นำ Effects สำหรับโหลดข้อมูลกลับมา
  useEffect(() => {
    if (open) fetchLeaveTypes({ forceReload: false });
  }, [open]);

  useEffect(() => {
    if (open) fetchLeaveTypes({ forceReload: true });
  }, [i18n.language]);

  // Click Outside logic สำหรับ Dropdown ประเภทการลา
  useEffect(() => {
    const onDocClick = (e) => {
      if (!openTypesDropdown) return;
      if (typesDropdownRef.current?.contains(e.target) || typesBtnRef.current?.contains(e.target)) return;
      setOpenTypesDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openTypesDropdown]);

  // Picker Handlers
  const handlePickerChange = (val) => {
    if (!val) return;
    if (pickerTarget === "month") {
      const [y, m] = val.split("-");
      setYear(y); setMonth(m);
    } else if (pickerTarget === "year") {
      setYear(val);
    }
    setPickerOpen(false);
  };

  const monthLabel = useMemo(() => {
    const d = new Date(Number(year), Number(month) - 1, 1);
    return format(d, "MMMM", { locale: i18n.language === "th" ? thLocale : enUS });
  }, [month, year, i18n.language]);

  // Filter & Download logic
  const filterLeaves = () => {
    return leaves.filter((lv) => {
      if (types.length > 0 && !types.includes(lv.type)) return false;
      if (scope === "ALL") return true;
      const start = new Date(lv.startDate || lv.date || lv.from);
      const y = Number(year);
      const m = Number(month);
      if (scope === "YEAR") return start.getFullYear() === y;
      if (scope === "MONTH") return start.getFullYear() === y && (start.getMonth() + 1) === m;
      return true;
    });
  };

  const download = () => {
    const rows = filterLeaves();
    const headers = ["id", "employeeName", "type", "status", "startDate", "endDate", "days", "reason", "approvedBy"];
    const csvContent = [
      headers.join(","),
      ...rows.map(r => [
        r.id, r.name || "", r.type, r.status, r.startDate, r.endDate, r.totalDaysRequested, r.reason, r.approvedBy
      ].map(v => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`)).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_${scope}_${year}_${month}.csv`;
    a.click();
    setOpen(false);
  };

  // ... (โค้ดส่วนบนคงเดิม)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-50 h-10 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition"
      >
        Export CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          {/* ✅ 1. เอา overflow-hidden ออกจากบรรทัดนี้ */}
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 relative">
            
            {/* Header - ✅ ใส่ rounded-t-2xl เพื่อให้มุมโค้งตาม Container */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl bg-white">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-slate-700" />
                <h3 className="text-lg font-bold text-slate-800">Export CSV</h3>
              </div>
              <button onClick={() => setOpen(false)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {/* Body - ✅ ตรวจสอบให้แน่ใจว่าไม่มี overflow-hidden ที่นี่ */}
            <div className="p-6 space-y-6 overflow-visible">
              {/* 1. Scope Selection */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase">ขอบเขตข้อมูล (Scope)</label>
                <div className="flex gap-2">
                  {["MONTH", "YEAR", "ALL"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScope(s)}
                      className={`px-4 h-9 rounded-full border font-bold text-sm transition ${
                        scope === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {s === "MONTH" ? "รายเดือน" : s === "YEAR" ? "รายปี" : "ทั้งหมด"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Date Pickers */}
              {scope !== "ALL" && (
                <div className="grid grid-cols-2 gap-4">
                  {scope === "MONTH" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">เดือน</label>
                      <button
                        onClick={() => { setPickerTarget("month"); setPickerOpen(true); }}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-left font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>{monthLabel}</span>
                        <CalendarDays size={18} className="text-slate-400" />
                      </button>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">ปี</label>
                    <button
                      onClick={() => { setPickerTarget("year"); setPickerOpen(true); }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-left font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>{year}</span>
                      <CalendarDays size={18} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Leave Types Dropdown */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase">ประเภทการลา (Leave Types)</label>
                <div className="relative" ref={typesBtnRef}>
                  <button
                    type="button"
                    onClick={() => !typesLoading && setOpenTypesDropdown(!openTypesDropdown)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between font-bold text-slate-700 disabled:bg-slate-50"
                    disabled={typesLoading}
                  >
                    {typesLoading ? (
                      <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> กำลังโหลด...</div>
                    ) : (
                      <span>{types.length === 0 ? "ทุกประเภท" : `เลือกไว้ ${types.length} ประเภท`}</span>
                    )}
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${openTypesDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* ✅ Dropdown กางออกมาได้โดยไม่โดนตัด */}
                  {openTypesDropdown && (
                    <div ref={typesDropdownRef} className="absolute z-[60] mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in duration-150">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                        <span className="text-sm font-bold text-slate-800">เลือกประเภท</span>
                        <div className="flex gap-3">
                          <button onClick={() => setTypes(leaveTypeFilters.map(t => t.typeName))} className="text-xs text-indigo-600 font-bold hover:underline">เลือกทั้งหมด</button>
                          <button onClick={() => setTypes([])} className="text-xs text-slate-400 font-bold hover:underline">ล้างค่า</button>
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {leaveTypeFilters.map((lt) => (
                          <label key={lt.typeName} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={types.includes(lt.typeName)}
                              onChange={() => {
                                setTypes(prev => prev.includes(lt.typeName) ? prev.filter(t => t !== lt.typeName) : [...prev, lt.typeName]);
                              }}
                              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className={`text-sm ${types.includes(lt.typeName) ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                              {lt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {typesError && <p className="text-xs text-red-500 font-medium">{typesError}</p>}
              </div>
            </div>

            {/* Footer - ✅ ใส่ rounded-b-2xl เพื่อให้มุมโค้งตาม Container */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
              <div className="text-sm font-bold text-slate-500">
                พบข้อมูล <span className="text-slate-900">{filterLeaves().length}</span> รายการ
              </div>
              <div className="flex gap-3">
                <button onClick={() => setOpen(false)} className="px-6 h-10 rounded-full font-bold text-slate-600 hover:bg-slate-200 transition">ยกเลิก</button>
                <button
                  onClick={download}
                  disabled={filterLeaves().length === 0}
                  className="px-6 h-10 rounded-full bg-slate-900 text-white font-black hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DateGridPicker (อยู่ชั้นนอกสุด) */}
      <DateGridPicker
        open={pickerOpen}
        granularity={pickerTarget === "year" ? "year" : "month"}
        allowAll={false}
        value={pickerTarget === "month" ? `${year}-${month}` : year}
        onChange={handlePickerChange}
        onClose={() => setPickerOpen(false)}
        title={pickerTarget === "month" ? "เลือกเดือนที่ต้องการ" : "เลือกปีที่ต้องการ"}
      />
    </>
  );
}