import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PaidDropdown({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // close when click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-11 w-full px-5 pr-10 rounded-2xl border border-gray-200 bg-white
          text-left font-black text-[12px] text-slate-800
          focus:ring-2 focus:ring-indigo-100 transition-all"
      >
        {value ? t("common.yes") : t("common.no")}

        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
            transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-20 mt-2 w-full rounded-2xl border border-gray-200
            bg-white shadow-xl overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              onChange(true);
              setOpen(false);
            }}
            className={`w-full px-5 py-3 text-left font-black text-[12px]
              transition-all hover:bg-indigo-50
              ${value === true ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            onClick={() => {
              onChange(false);
              setOpen(false);
            }}
            className={`w-full px-5 py-3 text-left font-black text-[12px]
              transition-all hover:bg-indigo-50
              ${value === false ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}
          >
            {t("common.no")}
          </button>
        </div>
      )}
    </div>
  );
}
