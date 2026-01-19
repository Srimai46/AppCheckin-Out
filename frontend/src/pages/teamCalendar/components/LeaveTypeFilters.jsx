// src/pages/teamCalendar/components/LeaveTypeFilters.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useYearEndProcessing } from "../../yearEnd/hooks/useYearEndProcessing";

const DEFAULT_COLOR = "#6366F1";

const normalizeHex = (value, fallback = DEFAULT_COLOR) => {
  if (!value || typeof value !== "string") return fallback;
  const v = value.trim();
  const isHex = /^#([0-9a-fA-F]{6})$/.test(v);
  return isHex ? v : fallback;
};

const isHexColor = (value) => {
  if (!value || typeof value !== "string") return false;
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
};

const getLeaveTypeLabel = (label, typeName, language) => {
  if (!label) return typeName || "-";
  if (typeof label === "string") return label; // รองรับข้อมูลเก่า

  const lang = language?.split("-")[0]; // en-US -> en
  return (
    label[lang] ||
    label.en ||
    label.th ||
    label.ja ||
    typeName ||
    "-"
  );
};

export default function LeaveTypeFilters({ selected = [], setSelected }) {
  const { t, i18n } = useTranslation();

  // ✅ reuse hook ที่คุณมีอยู่แล้ว
  const { leaveTypes = [], fetchLeaveTypes } = useYearEndProcessing();

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // ✅ โหลด leave types ทั้งหมด
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrMsg("");
        await fetchLeaveTypes();
      } catch (e) {
        if (!alive) return;
        setErrMsg(e?.message || "Failed to load leave types");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    // รองรับ refresh event (ที่ LeaveTypeCard dispatch ไว้)
    const onRefresh = async () => {
      try {
        await fetchLeaveTypes();
      } catch {
        // ignore
      }
    };
    window.addEventListener("leave-type-refresh", onRefresh);

    return () => {
      alive = false;
      window.removeEventListener("leave-type-refresh", onRefresh);
    };
  }, [fetchLeaveTypes]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // ✅ สร้าง items จาก leaveTypes (custom สี + label ตามภาษา)
  const items = useMemo(() => {
    return (leaveTypes || []).map((lt) => ({
      key: String(lt.id), // ✅ ถ้าระบบกรองเดิมใช้ typeName ให้เปลี่ยนเป็น String(lt.typeName)
      label: getLeaveTypeLabel(lt.label, lt.typeName, i18n.language),
      color: normalizeHex(lt.color, DEFAULT_COLOR),
    }));
  }, [leaveTypes, i18n.language]);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (errMsg && items.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[11px] font-black text-rose-600 uppercase tracking-widest">
          {errMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const active = selectedSet.has(item.key);

        const useHex = isHexColor(item.color);
        const dotStyle = useHex ? { backgroundColor: normalizeHex(item.color) } : undefined;
        const dotClass = useHex ? "" : item.color || "bg-indigo-500";

        return (
          <button
            key={item.key}
            type="button"
            onClick={() =>
              setSelected((prev) =>
                prev.includes(item.key)
                  ? prev.filter((x) => x !== item.key)
                  : [...prev, item.key]
              )
            }
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-black transition-all
              ${
                active
                  ? "bg-white border-blue-400 ring-2 ring-blue-200 scale-[1.03]"
                  : "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
              }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full border border-gray-200 ${dotClass}`}
              style={dotStyle}
              aria-hidden="true"
            />
            <span className="text-slate-700">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
