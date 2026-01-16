import React, { useMemo, useState } from "react";
import { AlertTriangle, Info, RefreshCw, Save } from "lucide-react";

import { useYearEndProcessing } from "../hooks/useYearEndProcessing";
import HistoryTable from "./HistoryTable";

export default function YearEndCard() {
  const {
    loading,
    targetYear,
    setTargetYear,

    leaveTypes,
    configs,

    quotas,
    carryOvers,
    handleQuotaChange,
    handleCarryOverChange,
    handleProcess,
    handleReopen,

    maxConsecutive,
    setMaxConsecutive,
  } = useYearEndProcessing();

  /* ================= Year Dropdown ================= */
  const [targetYearOpen, setTargetYearOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const years = useMemo(
    () => Array.from({ length: 3 }, (_, i) => currentYear + i),
    [currentYear]
  );

  return (
    <>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
        {/* ===== Header ===== */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-indigo-50 rounded-3xl text-indigo-600">
            <Info size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Year End Configuration
            </h2>
            <p className="text-sm text-gray-500">
              Configure carry-over, quotas, and global policies.
            </p>
          </div>
        </div>

        {/* ===== Carry Over ===== */}
        <div className="mb-10">
          <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
            Leave Type Carry Over
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-5">
            Maximum carry over days to next year (per employee)
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {leaveTypes.map((lt) => {
              const key = lt.typeName.toUpperCase();

              return (
                <div key={key}>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">
                    {lt.label?.en || lt.typeName}
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={carryOvers?.[key] ?? 0}
                    onChange={(e) =>
                      handleCarryOverChange(
                        key,
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full border border-gray-200 rounded-3xl px-3 py-2
                      text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== Quotas ===== */}
        <div>
          <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
            Configure Quotas for {targetYear}
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-6">
            Base leave quota per employee
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {leaveTypes.map((lt) => {
              const key = lt.typeName.toUpperCase();

              return (
                <div key={key}>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">
                    {lt.label?.en || lt.typeName}
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={quotas?.[key] ?? ""}
                    onChange={(e) =>
                      handleQuotaChange(
                        key,
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full border border-gray-200 rounded-3xl px-3 py-2
    text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              );
            })}
          </div>

          {/* ===== Max Consecutive ===== */}
          <div className="mb-6 p-5 bg-gray-50 rounded-3xl border border-gray-100">
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">
              Global Policy: Max Consecutive Holidays
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={maxConsecutive}
                onChange={(e) => setMaxConsecutive(Number(e.target.value))}
                className="w-32 border border-gray-200 rounded-3xl px-3 py-2
                  text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <span className="text-xs text-gray-400">0 = Unlimited</span>
            </div>
          </div>

          {/* ===== Action Bar ===== */}
          <div className="flex items-end justify-between pt-4 border-t border-gray-50">
            <div className="relative w-44">
              <span className="text-xs text-gray-400 font-bold mb-1 block">
                Target Year
              </span>

              <button
                type="button"
                onClick={() => setTargetYearOpen((v) => !v)}
                className="w-full bg-white border border-gray-300 rounded-3xl px-4 py-2
                  text-sm font-black flex items-center justify-between"
              >
                Year {targetYear}
                <span
                  className={`transition-transform ${
                    targetYearOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {targetYearOpen && (
                <div
                  className="absolute left-0 top-full z-20 mt-2 w-full rounded-3xl
                  bg-white shadow-xl border border-gray-100 overflow-hidden"
                >
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => {
                        setTargetYear(y);
                        setTargetYearOpen(false);
                      }}
                      className={`w-full px-6 py-3 text-left text-sm font-black
                        hover:bg-blue-50 ${
                          targetYear === y
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-700"
                        }`}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleProcess}
              disabled={loading}
              className="bg-indigo-600 text-white px-8 py-3 rounded-3xl
                hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2
                font-black uppercase text-[11px] shadow-lg"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {loading ? "Processing..." : "Confirm & Process"}
            </button>
          </div>
        </div>
      </div>

      <HistoryTable configs={configs} onReopen={handleReopen} />

      <div
        className="mt-6 flex items-start gap-3 text-amber-700 bg-amber-50
        p-4 rounded-3xl border border-amber-100"
      >
        <AlertTriangle size={20} />
        <div className="text-xs font-bold uppercase">
          This action will overwrite quotas for all employees and lock previous
          data.
        </div>
      </div>
    </>
  );
}
