import React, { useRef } from "react";
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
 * - labels?: { ALL?: string, WORKER?: string, HR?: string }
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
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useOutsideClick([btnRef, menuRef], () => setOpen(false));

  const labelMap = {
    ALL: labels?.ALL ?? "All Roles",
    WORKER: labels?.WORKER ?? "Worker",
    HR: labels?.HR ?? "HR",
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

  return (
    <div className={`relative ${widthClass}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full ${buttonClass}`}
      >
        <span>
          {value === "ALL"
            ? labelMap.ALL
            : value === "WORKER"
            ? labelMap.WORKER
            : labelMap.HR}
        </span>
        <span className={`ml-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div ref={menuRef} className={menuClass}>
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
                  ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "bg-white text-slate-700 hover:bg-gray-50"
                  }`}
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
