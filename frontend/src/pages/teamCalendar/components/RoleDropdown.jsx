import React, { useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useOutsideClick from "../hooks/useOutsideClick";

/**
 * Reusable Role Dropdown (ALL / WORKER / HR)
 *
 * Props:
 * - value: "ALL" | "WORKER" | "HR"
 * - onChange: (nextValue) => void
 * - open: boolean
 * - setOpen: (bool | (prev)=>bool) => void
 * - widthClass?: string  (default: "w-full")
 * - size?: "sm" | "md"   (default: "md")
 * - labels?: { ALL?: string, WORKER?: string, HR?: string }  // optional override
 */
export default function RoleDropdown({
  value,
  onChange,
  open,
  setOpen,
  widthClass = "w-full",
  size = "md",
  labels,
}) {
  const { t } = useTranslation();

  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useOutsideClick([btnRef, menuRef], () => setOpen(false));

  // ✅ fallback label มาจาก i18n (ไม่ hardcode อังกฤษ)
  const fallbackLabels = useMemo(
    () => ({
      ALL: t("teamCalendar.modal.role.all"),
      WORKER: t("teamCalendar.modal.role.worker"),
      HR: t("teamCalendar.modal.role.hr"),
    }),
    [t]
  );

  const labelMap = {
    ALL: labels?.ALL ?? fallbackLabels.ALL,
    WORKER: labels?.WORKER ?? fallbackLabels.WORKER,
    HR: labels?.HR ?? fallbackLabels.HR,
  };

  const buttonClass =
    size === "sm"
      ? `h-11 px-4 rounded-2xl bg-white border border-slate-200
         text-slate-800 font-black text-[11px] uppercase tracking-widest
         flex items-center justify-between outline-none focus:ring-2 focus:ring-blue-200`
      : `h-11 px-5 rounded-2xl bg-white border border-gray-200 shadow-sm
         text-slate-800 font-black text-[12px] uppercase tracking-widest
         flex items-center justify-between outline-none focus:ring-2 focus:ring-blue-200`;

  const menuClass =
    size === "sm"
      ? `absolute z-50 mt-2 w-full overflow-hidden rounded-2xl
         bg-white border border-slate-100 shadow-xl shadow-slate-200/70`
      : `absolute z-50 mt-2 w-full overflow-hidden rounded-2xl
         bg-white border border-gray-100 shadow-xl shadow-slate-200/70`;

  const options = [
    { value: "ALL", label: labelMap.ALL },
    { value: "WORKER", label: labelMap.WORKER },
    { value: "HR", label: labelMap.HR },
  ];

  const currentLabel =
    value === "ALL" ? labelMap.ALL : value === "WORKER" ? labelMap.WORKER : labelMap.HR;

  return (
    <div className={`relative ${widthClass}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full ${buttonClass}`}
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : "false"}
      >
        <span>{currentLabel}</span>
        <span className={`ml-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div ref={menuRef} className={menuClass} role="listbox">
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left ${size === "sm" ? "px-4" : "px-5"} py-3 font-black transition-colors
                  ${active ? "bg-blue-50 text-blue-700" : "bg-white text-slate-700 hover:bg-gray-50"}`}
                role="option"
                aria-selected={active ? "true" : "false"}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
