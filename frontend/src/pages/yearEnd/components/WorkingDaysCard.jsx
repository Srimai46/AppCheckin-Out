import React from "react";
import { RefreshCw, Save } from "lucide-react";
import { useHolidayPolicy } from "../hooks/useHolidayPolicy";

export default function WorkingDaysCard() {
  const { workingDays, toggleWorkingDay, policySaving, policyLoading, saveWorkingDaysPolicy } =
    useHolidayPolicy();

  const days = [
    { k: "MON", label: "Mon" },
    { k: "TUE", label: "Tue" },
    { k: "WED", label: "Wed" },
    { k: "THU", label: "Thu" },
    { k: "FRI", label: "Fri" },
    { k: "SAT", label: "Sat" },
    { k: "SUN", label: "Sun" },
  ];

  const disabledAll = policyLoading || policySaving;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="text-sm font-black text-slate-800 uppercase tracking-widest">Working Days</div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
          Select working days and save policy
        </div>
      </div>

      <div className="p-6">
        {policyLoading ? (
          <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Loading working days policy...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {days.map((d) => {
              const active = (workingDays || []).includes(d.k);
              return (
                <button
                  key={d.k}
                  type="button"
                  onClick={() => toggleWorkingDay(d.k)}
                  disabled={disabledAll}
                  className={`h-10 px-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
                    ${
                      active
                        ? "bg-white border-indigo-300 ring-2 ring-indigo-100 text-slate-800"
                        : "bg-gray-50 border-gray-200 text-gray-400 hover:text-slate-700 hover:bg-white"
                    }
                    ${disabledAll ? "opacity-50 cursor-not-allowed" : ""}
                  `}
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
        )}

        <div className="mt-4 flex items-center justify-between gap-3 flex-col sm:flex-row">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Currently:{" "}
            <span className="text-slate-600">
              {(workingDays || []).length ? (workingDays || []).map((x) => x.toLowerCase()).join(", ") : "-"}
            </span>
          </div>

          <button
            type="button"
            onClick={saveWorkingDaysPolicy}
            disabled={disabledAll}
            className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
              uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
              shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
          >
            {policySaving || policyLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {policyLoading ? "Loading..." : policySaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
