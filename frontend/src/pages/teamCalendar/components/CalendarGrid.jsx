import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  leaveTheme,
  weekendBgByDow,
  matchLeaveType as defaultMatch,
} from "../utils";
import { getLeaveTypes } from "../../../api/leaveService";

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

  /* ---------------- LeaveType cache (label json) ---------------- */
  const [leaveTypeMap, setLeaveTypeMap] = useState({});

  useEffect(() => {
    let active = true;
    getLeaveTypes().then((data) => {
      if (!active) return;
      const map = {};
      (data || []).forEach((t) => {
        const key = String(t.typeName || "").toUpperCase();
        map[key] = {
          label: t.label || null,
          color: t.color || null,
        };
      });
      setLeaveTypeMap(map);
    });
    return () => { active = false; };
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
    if (leaf?.label && typeof leaf.label === "object") {
      return leaf.label[lang] || leaf.label.en || Object.values(leaf.label)[0];
    }
    const key = String(leaf?.typeName || leaf?.type || "").toUpperCase();
    const fromType = leaveTypeMap[key]?.label;
    if (fromType && typeof fromType === "object") {
      return fromType[lang] || fromType.en || Object.values(fromType)[0];
    }
    return leaf?.typeName || leaf?.type || "UNKNOWN";
  };

  /* ---------------- Build badges per day ---------------- */
  const buildBadges = (day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    
    // ✅ FIX: ปรับปรุง Logic Filter ให้แข็งแรงขึ้น
    const rawLeaves = leavesByKey.get(dayKey) || [];
    const dayLeaves = rawLeaves.filter((leaf) => {
      // ถ้าไม่มีการเลือก Filter ให้แสดงทั้งหมด
      if (!selectedTypes || selectedTypes.length === 0) return true;

      // ดึงค่า Type ของใบลาออกมา Normalize
      const leafType = String(leaf.type || leaf.typeName || "").trim();
      
      // ตรวจสอบว่าตรงกับที่เลือกหรือไม่ (รองรับทั้ง matchLeaveType และการเทียบ String ปกติ)
      return selectedTypes.some((filterKey) => {
        // 1. ลองใช้ utility function ที่ส่งเข้ามา
        if (matchLeaveType(leafType, filterKey)) return true;
        
        // 2. ถ้า utility ไม่ work ให้ลองเทียบแบบ Case Insensitive String
        return leafType.toUpperCase() === String(filterKey).toUpperCase();
      });
    });

    // TYPE => { count, sample }
    const typeMap = dayLeaves.reduce((acc, leaf) => {
      const type = String(leaf.type || leaf.typeName || "UNKNOWN").toUpperCase();
      if (!acc[type]) {
        acc[type] = { count: 0, sample: leaf };
      }
      acc[type].count += 1;
      return acc;
    }, {});

    const typeBadges = Object.entries(typeMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

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
                "min-h-[115px] p-2 border-r border-b border-gray-100 cursor-pointer transition-all group",
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
                    const theme = leaveTheme(type);
                    const label = resolveLeaveLabel(sample);

                    return (
                      <div
                        key={type}
                        className={[
                          "text-[10px] px-2 py-1 rounded-lg border flex items-center gap-2 truncate font-black uppercase tracking-widest",
                          theme.border,
                          theme.bg,
                          theme.text,
                        ].join(" ")}
                        title={`${label} • ${count}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}
                        />
                        <span className="truncate">
                          {label} • {count}
                        </span>
                      </div>
                    );
                  })}

                  {Object.keys(typeMap).length > 3 && (
                    <div className="text-[10px] text-indigo-600 font-black pl-1 uppercase tracking-widest">
                      {t("teamCalendar.grid.moreTypes", {
                        count: Object.keys(typeMap).length - 3,
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