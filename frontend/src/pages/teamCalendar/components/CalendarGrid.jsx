// src/pages/teamCalendar/components/CalendarGrid.jsx
import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  weekendBgByDow,
  matchLeaveType as defaultMatch,
} from "../utils";
import { getLeaveTypes } from "../../../api/leaveService";

const DEFAULT_COLOR = "#6366F1";

/* ===================== Color helpers ===================== */
const normalizeHex = (value, fallback = DEFAULT_COLOR) => {
  if (!value || typeof value !== "string") return fallback;
  const v = value.trim();
  const isHex = /^#([0-9a-fA-F]{6})$/.test(v);
  return isHex ? v : fallback;
};

const getTypeKey = (type) => String(type || "").trim().toUpperCase();

// เลือกสีตัวอักษรให้อ่านง่ายตามความสว่างพื้นหลัง (ขาว/ดำ)
const pickTextColor = (hex) => {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return "#0f172a";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return y < 140 ? "#ffffff" : "#0f172a";
};

const themeFromDb = (type, leaveTypeMap) => {
  const key = getTypeKey(type);
  const hex = normalizeHex(leaveTypeMap?.[key]?.color, DEFAULT_COLOR);

  return {
    hex,
    text: pickTextColor(hex),
    bg: `${hex}22`,
    border: `${hex}55`,
    dot: hex,
    text: hex,
    bg: `${hex}14`,
    border: `${hex}55`,
  };
};

/* ===================== Component ===================== */
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  /* ---------------- LeaveType cache (label + color from DB) ---------------- */
  const [leaveTypeMap, setLeaveTypeMap] = useState({});

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getLeaveTypes();
        if (!active) return;

        const map = {};
        (data || []).forEach((lt) => {
          const key = getTypeKey(lt?.typeName);
          if (!key) return;
          map[key] = {
            label: lt?.label || null,
            color: lt?.color || null,
          };
        });
        setLeaveTypeMap(map);
      } catch {
        // เงียบไว้ (ยัง render ได้ด้วย DEFAULT_COLOR)
        if (!active) return;
        setLeaveTypeMap({});
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /* ---------------- Group leaves by dateKey ---------------- */
  const leavesByKey = useMemo(() => {
    const map = new Map();
    (leaves || []).forEach((leaf) => {
      if (!leaf?.dateKey) return;
      const arr = map.get(leaf.dateKey) || [];
      arr.push(leaf);
      map.set(leaf.dateKey, arr);
    });
    return map;
  }, [leaves]);

  /* ---------------- Resolve label by current language ---------------- */
  const resolveLeaveLabel = (leaf) => {
    // 1) label ที่มากับ leaf
    if (leaf?.label && typeof leaf.label === "object") {
      const v =
        leaf.label[lang] ||
        leaf.label?.[lang?.split("-")?.[0]] ||
        leaf.label.en ||
        Object.values(leaf.label)[0];
      return v || leaf?.typeName || leaf?.type || "UNKNOWN";
    }
    if (typeof leaf?.label === "string" && leaf.label.trim()) {
      return leaf.label;
    }

    // 2) label จาก DB (leaveTypeMap)
    const key = getTypeKey(leaf?.typeName || leaf?.type);
    const fromType = leaveTypeMap[key]?.label;

    if (fromType && typeof fromType === "object") {
      const v =
        fromType[lang] ||
        fromType?.[lang?.split("-")?.[0]] ||
        fromType.en ||
        Object.values(fromType)[0];
      return v || leaf?.typeName || leaf?.type || "UNKNOWN";
    }
    if (typeof fromType === "string" && fromType.trim()) {
      return fromType;
    }

    return leaf?.typeName || leaf?.type || "UNKNOWN";
  };

  /* ---------------- Build badges per day ---------------- */
  const buildBadges = (day) => {
    const dayKey = format(day, "yyyy-MM-dd");

    const rawLeaves = leavesByKey.get(dayKey) || [];
    const dayLeaves = rawLeaves.filter((leaf) => {
      // ถ้าไม่เลือก filter => แสดงทั้งหมด
      if (!selectedTypes || selectedTypes.length === 0) return true;

      const leafType = String(leaf.type || leaf.typeName || "").trim();

      return selectedTypes.some((filterKey) => {
        // 1) ใช้ util matchLeaveType ก่อน
        if (matchLeaveType(leafType, filterKey)) return true;

        // 2) fallback เทียบแบบ case-insensitive
        return (
          leafType.toUpperCase() === String(filterKey || "").trim().toUpperCase()
        );
      });
    });

    // TYPE => { count, sample }
    const typeMap = dayLeaves.reduce((acc, leaf) => {
      const type = getTypeKey(leaf.type || leaf.typeName || "UNKNOWN");
      if (!acc[type]) acc[type] = { count: 0, sample: leaf };
      acc[type].count += 1;
      return acc;
    }, {});

    const typeBadges = Object.entries(typeMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2);

    return { typeMap, typeBadges };
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="bg-white rounded-[2rem] border border-blue-200 ring-2 overflow-hidden">
      {/* Week headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
        {weekHeaders.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-black text-slate-700"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 bg-white">
        {days.map((day) => {
          const { typeMap, typeBadges } = buildBadges(day);
          const inMonth = isSameMonth(day, currentDate);
          const weekendBg = weekendBgByDow(day.getDay());

          return (
            <div
              key={day.toString()}
              onClick={() => onDayClick(day)}
              className={[
                "min-h-[128px] p-2 border-r border-b border-gray-100 cursor-pointer transition-all group",
                inMonth ? "bg-white" : "bg-gray-50/50 opacity-60",
                weekendBg,
                "hover:bg-slate-50",
              ].join(" ")}
            >
              {/* Day number */}
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

              {/* Leave badges */}
              {loading ? (
                <div className="mt-2 text-[10px] text-gray-300 font-bold">
                  {t("teamCalendar.grid.loading")}
                </div>
              ) : (
                <div className="mt-2 space-y-1">
                  {typeBadges.map(([type, { count, sample }]) => {
                    const theme = themeFromDb(type, leaveTypeMap);
                    const label = resolveLeaveLabel(sample);

                    return (
                      <div
                        key={type}
                        className="text-[10px] px-2 py-1 rounded-lg border flex items-center gap-2 truncate font-black uppercase tracking-widest"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                        title={`${label} • ${count}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full border border-white/30"
                          style={{ backgroundColor: theme.dot }}
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {label} • {count}
                        </span>
                      </div>
                    );
                  })}

                  {Object.keys(typeMap).length > 2 && (
                    <div className="text-[10px] text-indigo-600 font-black pl-1 uppercase tracking-widest">
                      {t("teamCalendar.grid.moreTypes", {
                        count: Object.keys(typeMap).length - 2,
                      })}
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
