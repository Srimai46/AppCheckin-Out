import React from "react";

export default function QuotaCards({ quotas }) {
  if (!quotas || quotas.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {quotas.map((q, idx) => {
        const total = parseFloat(q.total) || 0;
        const used = parseFloat(q.used) || 0;
        const percent = total > 0 ? (used / total) * 100 : 0;

        return (
          <div
            key={idx}
            className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-md transition-all animate-in fade-in"
          >
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">
              {q.type}
            </div>
            <div className="text-3xl font-black text-slate-800 tracking-tighter">
              {q.remaining}{" "}
              <span className="text-xs font-normal text-gray-400 uppercase">
                Days
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 font-black uppercase tracking-tighter">
              Used {used} / Total {total}
            </div>
            <div className="mt-4 w-full bg-gray-50 h-1.5 rounded-full overflow-hidden border border-gray-50">
              <div
                className={`h-full transition-all duration-700 ${
                  percent >= 100 ? "bg-rose-500" : "bg-blue-600"
                }`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}