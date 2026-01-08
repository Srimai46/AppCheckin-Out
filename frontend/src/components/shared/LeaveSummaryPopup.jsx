// frontend/src/components/shared/LeaveSummaryPopup.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, X } from "lucide-react";
import { useTranslation } from "react-i18next";

/* ===================== helpers ===================== */
const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const norm = (s) => String(s ?? "").trim().toLowerCase();

/** ✅ รองรับหลายรูปแบบ: label:{th,en} , labelTh/labelEn , nameTh/nameEn , typeName */
const pickTypeLabel = (type, lang) => {
  if (!type) return "-";
  const isTH = String(lang || "").startsWith("th");

  const th =
    type?.label?.th ||
    type?.labelTh ||
    type?.nameTh ||
    type?.thaiName ||
    type?.typeNameTh ||
    type?.typeNameTH ||
    type?.typeName_th ||
    type?.type_name_th ||
    type?.titleTh ||
    type?.title_th ||
    type?.name_th ||
    type?.displayNameTh ||
    type?.display_th;

  const en =
    type?.label?.en ||
    type?.labelEn ||
    type?.nameEn ||
    type?.englishName ||
    type?.typeNameEn ||
    type?.typeNameEN ||
    type?.typeName_en ||
    type?.type_name_en ||
    type?.titleEn ||
    type?.title_en ||
    type?.name_en ||
    type?.displayNameEn ||
    type?.display_en;

  const fallback =
    type?.typeName ||
    type?.type_name ||
    type?.leaveTypeName ||
    type?.leave_type_name ||
    type?.name ||
    type?.title ||
    "-";

  return isTH ? th || en || fallback : en || th || fallback;
};

const isSpecialType = (type) => {
  const code = norm(type?.code || type?.key || type?.slug || "");
  const name = norm(
    type?.typeName || type?.name || type?.label?.en || type?.label?.th || type?.labelEn || type?.labelTh || ""
  );
  return code.includes("special") || name.includes("special");
};

/** ✅ quota ในโปรเจกต์คุณเป็นแบบ { type, total, remaining, used, carryOver, baseQuota, year } */
const quotaTypeKey = (q) => norm(q?.type || q?.typeName || q?.leaveTypeName || q?.leaveType?.name || q?.name);
const typeKey = (tp) => norm(tp?.typeName || tp?.name || tp?.label?.en || tp?.label?.th || tp?.labelEn || tp?.labelTh);

const carryDaysOf = (q) => safeNum(q?.carryOverDays) || safeNum(q?.carryOver) || safeNum(q?.carryOver) || 0;
const totalDaysOf = (q) => safeNum(q?.totalDays) || safeNum(q?.total) || safeNum(q?.quotaDays) || safeNum(q?.days) || 0;
const usedDaysOf = (q) => safeNum(q?.usedDays) || safeNum(q?.used) || 0;
const remainingDaysOf = (q, total, used) =>
  safeNum(q?.remainingDays) || safeNum(q?.remaining) || safeNum(q?.remain) || Math.max(total - used, 0);
const baseDaysOf = (q, total, carry) =>
  safeNum(q?.baseDays) || safeNum(q?.baseQuota) || safeNum(q?.base) || (carry > 0 ? Math.max(total - carry, 0) : total);

/**
 * ✅ กติกา columns หลักของกริด
 * - ถ้า n หาร 3 ลงตัว (>=6) => 3 คอลัมน์
 * - else ถ้า n หาร 4 ลงตัว (>=4) => 4 คอลัมน์
 * - else ถ้า n === 5 => 3 คอลัมน์ (แถวบน 3 / แถวล่าง 2 และเว้นช่องให้กล่อง 5 อยู่ใต้กล่อง 2)
 * - fallback => 4 คอลัมน์
 */
const computeMainCols = (n) => {
  if (!n || n <= 0) return 1;
  if (n >= 6 && n % 3 === 0) return 3;
  if (n >= 4 && n % 4 === 0) return 4;
  if (n === 5) return 3;
  return 4;
};

/** ✅ สร้าง rows + placeholder เพื่อให้ n=5 เป็น 3/2 และ “ใบที่ 5 อยู่ใต้ใบที่ 2” */
const buildRowsWithPlaceholders = (cards, cols) => {
  const n = cards.length;

  // case พิเศษ: 5 ใบ => แถว1 3 ใบ, แถว2 2 ใบโดยวางที่คอลัมน์ 1-2 (เว้นคอลัมน์ 3)
  if (n === 5 && cols === 3) {
    return [
      [cards[0], cards[1], cards[2]],
      [cards[3], cards[4], null], // ✅ ใบที่ 5 อยู่ใต้ใบที่ 2
    ];
  }

  const rows = [];
  for (let i = 0; i < n; i += cols) {
    const row = cards.slice(i, i + cols);
    while (row.length < cols) row.push(null);
    rows.push(row);
  }
  return rows;
};

/* ===================== Card ===================== */
function Card({ c }) {
  const { t } = useTranslation();

  return (
    <div
      className={[
        "bg-white rounded-[2.2rem] p-6 shadow-sm border transition-all",
        c.isSpecial ? "border-rose-200 ring-1 ring-rose-100" : "border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div
          className={[
            "text-xs font-black uppercase tracking-widest",
            c.isSpecial ? "text-rose-400" : "text-gray-300",
          ].join(" ")}
        >
          {c.label}
        </div>

        {c.carry > 0 && (
          <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black whitespace-nowrap">
            +{c.carry} {t("quota.carryOver")}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <div className="text-5xl font-black text-slate-900 leading-none">{c.remaining}</div>
        <div className="text-sm font-black text-gray-400 mb-1">{t("common.days")}</div>
      </div>

      <div className="mt-2 text-sm font-bold text-gray-500">
        {t("quota.usedTotal", { used: c.used, total: c.total })}
        {c.carry > 0 && (
          <span className="text-blue-600 font-black ml-2">
            {t("quota.carriedDetail", { base: c.base, carry: c.carry })}
          </span>
        )}
        {c.isSpecial && (
          <span className="block mt-2 text-rose-400 font-black text-xs">{t("quota.specialUsage")}</span>
        )}
      </div>

      <div className="mt-5">
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={["h-full rounded-full", c.isSpecial ? "bg-rose-300" : "bg-gray-200"].join(" ")}
            style={{ width: `${c.pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ===================== cards grid ===================== */
function LeaveTypeCards({ leaveTypes = [], quotas = [] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "th";

  // ✅ ทำ map ของ quota โดย key = ชื่อ type (lowercase)
  const quotaByType = useMemo(() => {
    const m = new Map();
    (quotas || []).forEach((q) => {
      const k = quotaTypeKey(q);
      if (!k) return;
      m.set(k, q);
    });
    return m;
  }, [quotas]);

  const cards = useMemo(() => {
    // ✅ ใช้ leaveTypes เป็นหลัก เพื่อให้ “มี 5 ก็ต้องขึ้น 5”
    const types = Array.isArray(leaveTypes) ? leaveTypes : [];
    if (!types.length) {
      // ถ้าไม่มี leaveTypes จริงๆ ค่อย fallback จาก quota
      return (quotas || []).map((q, idx) => {
        const label = String(q?.type || q?.typeName || q?.leaveTypeName || "-");
        const carry = carryDaysOf(q);
        const total = totalDaysOf(q);
        const used = usedDaysOf(q);
        const remaining = remainingDaysOf(q, total, used);
        const base = baseDaysOf(q, total, carry);
        const pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
        return {
          key: `q-${idx}-${label}`,
          label,
          isSpecial: isSpecialType({ name: label }),
          carry,
          base,
          total,
          used,
          remaining,
          pct,
        };
      });
    }

    return types.map((tp) => {
      const key = typeKey(tp) || String(tp?.id ?? tp?.typeName ?? tp?.name ?? Math.random());
      const label = pickTypeLabel(tp, lang);

      const q = quotaByType.get(key); // ✅ จับคู่ตามชื่อ type

      const carry = q ? carryDaysOf(q) : 0;
      const total = q ? totalDaysOf(q) : 0;
      const used = q ? usedDaysOf(q) : 0;
      const remaining = q ? remainingDaysOf(q, total, used) : 0;
      const base = q ? baseDaysOf(q, total, carry) : 0;
      const pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;

      return {
        key,
        label,
        isSpecial: isSpecialType(tp),
        carry,
        base,
        total,
        used,
        remaining,
        pct,
      };
    });
  }, [leaveTypes, quotas, quotaByType, lang]);

  const cols = useMemo(() => computeMainCols(cards.length), [cards.length]);
  const rows = useMemo(() => buildRowsWithPlaceholders(cards, cols), [cards, cols]);

  // ✅ ถ้าปีนั้นไม่มี quota เลยให้ขึ้น noData
  if (!Array.isArray(quotas) || quotas.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center text-gray-500 font-bold">
        {t("quota.noData")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {row.map((c, i) => (c ? <Card key={c.key} c={c} /> : <div key={`empty-${rIdx}-${i}`} />))}
        </div>
      ))}
    </div>
  );
}

/* ===================== Popup Component ===================== */
export default function LeaveSummaryPopup({
  selectedYear,
  setSelectedYear,
  years,
  formatYear,
  leaveTypes,
  quotas,
  leaves, // (ไม่ใช้ในเวอร์ชันนี้ เพราะ quota มี used/remaining แล้ว)
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "th";

  const [open, setOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const popRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      const pop = popRef.current;
      const btn = btnRef.current;
      if (pop && pop.contains(e.target)) return;
      if (btn && btn.contains(e.target)) return;
      setOpen(false);
      setYearOpen(false);
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setYearOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-full flex items-center justify-center rounded-3xl bg-gray-200 hover:bg-gray-300 text-slate-800 font-black shadow-lg transition-all hover:-translate-y-1 py-4"
        aria-label={t("dashboard.title")}
        title={t("dashboard.title")}
      >
        <LayoutGrid className="text-slate-700" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20" />

          <div className="absolute inset-0 flex items-start justify-center p-6 pt-24">
            <div
              ref={popRef}
              className="w-full bg-white rounded-[2.6rem] border border-gray-200 shadow-2xl overflow-hidden"
              style={{
                maxWidth: "1400px",
                maxHeight: "calc(100vh - 140px)",
              }}
            >
              <div className="p-10 pb-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t("dashboard.selectYear")}
                    </div>
                    <div className="text-2xl font-black text-slate-900">{t("dashboard.title")}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setYearOpen((v) => !v)}
                        className={`rounded-full px-6 py-3 font-black text-sm border border-gray-300 bg-white shadow-sm
                          ${yearOpen ? "ring-2 ring-blue-100" : ""}
                        `}
                      >
                        <span className="inline-flex items-center gap-3">
                          {t("dashboard.year")} {formatYear(selectedYear, lang)}
                          <ChevronDown size={18} className={`transition-transform ${yearOpen ? "rotate-180" : ""}`} />
                        </span>
                      </button>

                      {yearOpen && (
                        <div className="absolute z-50 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden right-0">
                          {years.map((y) => (
                            <button
                              key={y}
                              onClick={() => {
                                setSelectedYear(y);
                                setYearOpen(false);
                              }}
                              className={`w-full px-6 py-3 text-left text-sm font-black
                                hover:bg-blue-50 transition-all
                                ${selectedYear === y ? "bg-blue-50 text-blue-700" : "text-slate-700"}
                              `}
                            >
                              {t("dashboard.year")} {formatYear(y, lang)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setOpen(false);
                        setYearOpen(false);
                      }}
                      className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      aria-label={t("common.cancel")}
                      title={t("common.cancel")}
                    >
                      <X className="text-slate-700" size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-10 pb-10 overflow-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
                <LeaveTypeCards leaveTypes={leaveTypes} quotas={quotas} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
