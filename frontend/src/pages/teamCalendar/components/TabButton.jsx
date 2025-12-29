import React from "react";

export default function TabButton({ active, onClick, label, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 px-5 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition flex items-center gap-2",
        active
          ? "bg-white border-slate-300 text-slate-900 shadow-sm"
          : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}