// src/pages/teamCalendar/components/LeaveTypeFilters.jsx
import React from "react";

export default function LeaveTypeFilters({ items, selected, setSelected }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const active = selected.includes(item.key);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() =>
              setSelected((prev) =>
                prev.includes(item.key) ? prev.filter((t) => t !== item.key) : [...prev, item.key]
              )
            }
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-black transition-all
              ${
                active
                  ? "bg-white border-blue-400 ring-2 ring-blue-200 scale-[1.03]"
                  : "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
              }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-slate-700">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
