import React from "react";
import { RefreshCw, Save } from "lucide-react";
import TimePicker from "../../../components/TimePicker";
import { useHolidayPolicy } from "../hooks/useHolidayPolicy";

export default function WorkTimeByRoleCard() {
  const { workTimeByRole, updateWorkTime, workTimeSaving, saveWorkTimePolicy } = useHolidayPolicy();

  return (
    <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50/50 p-5">
      <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
        <div>
          <div className="text-sm font-black text-slate-800 uppercase tracking-widest">Work Time (By Role)</div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Set check-in / check-out time for each role
          </div>
        </div>

        <button
          type="button"
          onClick={saveWorkTimePolicy}
          disabled={workTimeSaving}
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
            <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">{x.label}</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Check-in Time
                </label>
                <TimePicker
                  value={workTimeByRole?.[x.role]?.start || "09:00"}
                  onChange={(v) => updateWorkTime(x.role, "start", v)}
                />
              </div>

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
  );
}
