// src/pages/teamCalendar/components/CalendarGrid.jsx
import React, { useMemo } from "react";
import { format } from "date-fns";
import { leaveTheme, weekendBgByDow, matchLeaveType as defaultMatch } from "../utils";

export default function CalendarGrid({
  weekHeaders,
  days,
  currentDate,
  loading,
  leaves,
  selectedTypes,
  onDayClick,
  isSameMonth,
  isToday,
  matchLeaveType = defaultMatch,
}) {
  const leavesByKey = useMemo(() => {
    const map = new Map();
    (leaves || []).forEach((leaf) => {
      const key = leaf.dateKey;
      if (!key) return;
      const arr = map.get(key) || [];
      arr.push(leaf);
      map.set(key, arr);
    });
    return map;
  }, [leaves]);

  const buildBadges = (day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayLeaves = (leavesByKey.get(dayKey) || []).filter((leaf) => {
      if (!selectedTypes?.length) return true;
      return selectedTypes.some((f) => matchLeaveType(leaf.type, f));
    });

    const typeCounts = dayLeaves.reduce((acc, leaf) => {
      const t = String(leaf.type || "UNKNOWN").toUpperCase();
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const typeBadges = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { typeCounts, typeBadges };
  };

  return (
    <div className="bg-white rounded-[2rem] border border-blue-200 ring-2 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
        {weekHeaders.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-black text-slate-700">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-white">
        {days.map((day) => {
          const { typeCounts, typeBadges } = buildBadges(day);
          const inMonth = isSameMonth(day, currentDate);
          const weekendBg = weekendBgByDow(day.getDay());

          return (
            <div
              key={day.toString()}
              onClick={() => onDayClick(day)}
              className={[
                "min-h-[115px] p-2 border-r border-b border-gray-100 cursor-pointer transition-all group",
                inMonth ? "bg-white" : "bg-gray-50/50 opacity-60",
                weekendBg,
                "hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <span
                  className={[
                    "text-[12px] font-black w-9 h-9 rounded-2xl flex items-center justify-center",
                    isToday(day)
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "text-slate-500 group-hover:text-slate-900",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </span>
              </div>

              {loading ? (
                <div className="mt-2 text-[10px] text-gray-300 font-bold">loading...</div>
              ) : (
                <div className="mt-2 space-y-1">
                  {typeBadges.map(([type, count]) => {
                    const theme = leaveTheme(type);
                    return (
                      <div
                        key={type}
                        className={[
                          "text-[10px] px-2 py-1 rounded-lg border flex items-center gap-2 truncate font-black uppercase tracking-widest",
                          theme.border,
                          theme.bg,
                          theme.text,
                        ].join(" ")}
                        title={`${type} • ${count}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                        <span className="truncate">
                          {type} • {count}
                        </span>
                      </div>
                    );
                  })}
                  {Object.keys(typeCounts).length > 3 && (
                    <div className="text-[10px] text-indigo-600 font-black pl-1 uppercase tracking-widest">
                      +{Object.keys(typeCounts).length - 3} types
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
