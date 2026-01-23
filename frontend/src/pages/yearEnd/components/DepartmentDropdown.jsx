// src/pages/teamCalendar/components/DepartmentDropdown.jsx
import React, { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import useOutsideClick from "../hooks/useOutsideClick";

/**
 * Reusable Department Dropdown (ALL + items from DB)
 *
 * Props:
 * - value: "ALL" | string | number
 * - onChange: (nextValue) => void
 * - items: Array<{ id: string|number, name: string }>  // from DB
 * - open: boolean
 * - setOpen: (bool | (prev)=>bool) => void
 * - widthClass?: string  (default: "w-full")
 * - size?: "sm" | "md"   (default: "md")
 * - allLabelKey?: string (default: "teamCalendar.attendance.department.all")
 * - placeholderKey?: string (optional) // if want separate placeholder behavior
 */
export default function DepartmentDropdown({
  value,
  onChange,
  items = [],
  open,
  setOpen,
  widthClass = "w-full",
  size = "md",
  allLabelKey = "teamCalendar.attendance.department.all",
}) {
  const { t } = useTranslation();

  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useOutsideClick([btnRef, menuRef], () => setOpen(false));

  const allLabel = t(allLabelKey, "All Departments");

  const options = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const mapped = arr
      .map((d) => {
        if (!d) return null;
        const id = d.id ?? d.departmentId ?? d.value ?? d.code ?? d.name;
        const name = d.name ?? d.departmentName ?? d.label ?? String(id ?? "");
        if (id == null || !name) return null;
        return { value: String(id), label: String(name) };
      })
      .filter(Boolean);

    // de-dup by value
    const seen = new Set();
    const uniq = [];
    for (const o of mapped) {
      if (seen.has(o.value)) continue;
      seen.add(o.value);
      uniq.push(o);
    }
    return [{ value: "ALL", label: allLabel }, ...uniq];
  }, [items, allLabel]);

  const currentLabel =
    String(value) === "ALL"
      ? allLabel
      : options.find((o) => String(o.value) === String(value))?.label ||
        (value ? String(value) : allLabel);

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
        <span className="truncate">{currentLabel}</span>
        <span className={`ml-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div ref={menuRef} className={menuClass} role="listbox">
          {options.map((opt) => {
            const active = String(value) === String(opt.value);
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
                title={opt.label}
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
