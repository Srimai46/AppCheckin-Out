import React from "react";
import { RefreshCw, Save } from "lucide-react";
import { useHolidayPolicy } from "../hooks/useHolidayPolicy";

export default function MaxConsecutiveCard() {
  const {
    maxConsecutiveHolidayDays,
    setMaxConsecutiveHolidayDays,
    maxConsecutiveSaving,
    saveMaxConsecutivePolicy,
  } = useHolidayPolicy();

  return (
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
          <input
            type="number"
            min={1}
            max={365}
            value={maxConsecutiveHolidayDays}
            onChange={(e) =>
              setMaxConsecutiveHolidayDays(Number(e.target.value))
            }
            className="w-24 h-11 px-4 rounded-2xl bg-white border border-gray-200
              text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
          />

          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            day(s)
          </span>

          <button
            type="button"
            onClick={saveMaxConsecutivePolicy}
            disabled={maxConsecutiveSaving}
            className="h-11 px-5 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
              uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
              shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
          >
            {maxConsecutiveSaving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {maxConsecutiveSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
