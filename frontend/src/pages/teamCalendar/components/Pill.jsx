import React from "react";

export default function Pill({ color, label, value }) {
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black ${color}`}>
      <span>{label}</span>
      <span className="px-2 py-0.5 rounded-full bg-white/70 border border-black/5 text-[10px] font-black">
        {value}
      </span>
    </div>
  );
}
