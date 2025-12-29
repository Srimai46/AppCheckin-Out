import { useEffect, useMemo, useRef, useState } from "react";

const pad2 = (n) => String(n).padStart(2, "0");
const isValidHHMM = (t) => /^\d{2}:\d{2}$/.test(String(t || ""));

export default function TimePicker({ value = "09:00", onChange, label = "Select time" }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // ✅ normalize value ให้เป็น HH:MM เสมอ
  const normalized = useMemo(() => {
    const v = String(value || "").trim();
    if (isValidHHMM(v)) return v;
    return "09:00";
  }, [value]);

  const [hh, mm] = normalized.split(":"); // safe แน่นอน

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad2(i)), []);
  const minutes = useMemo(() => ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"], []);

  const setTime = (newH = hh, newM = mm) => {
    const out = `${newH}:${newM}`;
    onChange?.(out);
  };

  // ✅ click outside ปิด dropdown
  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-11 px-4 rounded-2xl border border-gray-200 bg-white
          font-black text-slate-800 text-[12px] flex items-center justify-between
          hover:bg-gray-50 transition outline-none focus:ring-2 focus:ring-indigo-100"
        aria-label={label}
      >
        <span>{normalized}</span>
        <span className="text-gray-400 text-[10px] font-black">HH:MM</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[520px] max-w-[90vw] rounded-3xl bg-white shadow-xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 gap-3">
            {/* Hours */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-2">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Hour
              </div>
              <div className="max-h-44 overflow-auto pr-1">
                <div className="grid grid-cols-4 gap-1">
                  {hours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTime(h, mm)}
                      className={`h-9 rounded-xl text-[11px] font-black transition active:scale-95
                        ${h === hh ? "bg-indigo-600 text-white" : "bg-white hover:bg-indigo-50 text-slate-700 border border-gray-100"}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Minutes */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-2">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Minute
              </div>
              <div className="max-h-44 overflow-auto pr-1">
                <div className="grid grid-cols-3 gap-1">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTime(hh, m)}
                      className={`h-9 rounded-xl text-[11px] font-black transition active:scale-95
                        ${m === mm ? "bg-indigo-600 text-white" : "bg-white hover:bg-indigo-50 text-slate-700 border border-gray-100"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setTime("09", "00")}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
