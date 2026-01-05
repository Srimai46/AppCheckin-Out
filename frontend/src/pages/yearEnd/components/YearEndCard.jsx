import React, { useMemo, useState } from "react";
import { AlertTriangle, Info, RefreshCw, Save } from "lucide-react";
import { useCarryOverLimits } from "../hooks/useCarryOverLimits";
// import { useHolidayPolicy } from "../hooks/useHolidayPolicy"; // ไม่จำเป็นต้องใช้แล้ว
import { useYearEndProcessing } from "../hooks/useYearEndProcessing";
import HistoryTable from "./HistoryTable";

export default function YearEndCard() {
  const { carryOverLimits } = useCarryOverLimits();
  
  // ✅ ดึง maxConsecutive และ setMaxConsecutive มาใช้
  const { 
    configs, 
    loading, 
    targetYear, 
    setTargetYear, 
    quotas, 
    handleQuotaChange, 
    handleProcess, 
    handleReopen,
    maxConsecutive,      // [ใหม่]
    setMaxConsecutive    // [ใหม่]
  } = useYearEndProcessing();

  // dropdown year state
  const [targetYearOpen, setTargetYearOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const FUTURE_YEARS = 3;
  const years = useMemo(() => Array.from({ length: FUTURE_YEARS }, (_, i) => currentYear + i), [currentYear]);

  return (
    <>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 rounded-3xl text-indigo-600">
            <Info size={24} />
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Configure Quotas for {targetYear}</h2>
            <p className="text-sm text-gray-500 mb-6">
              Set the base leave quotas to be assigned to all employees along with carry-over and policies.
            </p>

            {/* --- Quota Inputs --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.keys(quotas).map((type) => (
                <div key={type}>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">{type}</label>
                  <input
                    type="number"
                    min="0"
                    value={quotas[type]}
                    onChange={(e) => handleQuotaChange(type, e.target.value)}
                    className="w-full border border-gray-200 rounded-3xl px-3 py-2 text-sm font-bold
                      focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                  />
                </div>
              ))}
            </div>

            {/* --- ✅ [UI ใหม่] Max Consecutive Days Input --- */}
            <div className="mb-6 p-5 bg-gray-50 rounded-3xl border border-gray-100">
               <label className="block text-xs font-black text-gray-500 uppercase mb-2">
                 Global Policy: Max Consecutive Working Days
               </label>
               <div className="flex flex-col md:flex-row md:items-center gap-3">
                 <input
                   type="number"
                   min="0"
                   value={maxConsecutive}
                   onChange={(e) => setMaxConsecutive(e.target.value)}
                   className="w-full md:w-32 border border-gray-200 rounded-3xl px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                   placeholder="0"
                 />
                 <span className="text-xs text-gray-400 font-medium">
                   (Set <strong>0</strong> for Unlimited. This applies to all leave types unless overridden.)
                 </span>
               </div>
            </div>

            {/* --- Action Bar --- */}
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
                  <svg
                    className={`w-4 h-4 transition-transform ${targetYearOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {targetYearOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setTargetYearOpen(false)}
                      aria-label="Close target year dropdown"
                    />
                    <div className="absolute z-20 mt-2 w-full rounded-3xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                      {years.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
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

              <button
                onClick={handleProcess}
                disabled={loading}
                className="mt-5 bg-indigo-600 text-white px-8 py-2.5 rounded-3xl hover:bg-indigo-700 disabled:bg-gray-400
                  flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {loading ? "Processing..." : "Confirm & Process"}
              </button>
            </div>

            {/* Debug info (Optional) */}
            <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Current Settings:{" "}
              <span className="text-slate-600">
                {Object.keys(carryOverLimits)
                  .map((k) => `${k}:${carryOverLimits[k]}`)
                  .join(" | ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <HistoryTable configs={configs} onReopen={handleReopen} />

      <div className="mt-6 flex items-center gap-3 text-amber-700 bg-amber-50 p-4 rounded-3xl border border-amber-100">
        <AlertTriangle size={20} className="shrink-0" />
        <div className="text-xs font-bold leading-relaxed uppercase tracking-tight">
          Warning: Pressing this button will "overwrite" the quotas for all employees in the target year. And immediately lock last year's data.
          Please ensure the correct number of leave days to be distributed.
        </div>
      </div>
    </>
  );
}