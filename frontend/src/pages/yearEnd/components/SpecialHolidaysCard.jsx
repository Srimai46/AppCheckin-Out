//frontend/src/pages/yearEnd/components/SpecialHolidaysCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useHolidayPolicy } from "../hooks/useHolidayPolicy";
import { calcTotalDays, safeYMD } from "../utils";
import { useTranslation } from "react-i18next";



const PAGE_SIZE = 5;




// ===== Date formatter: DD-MM-YYYY, locale-aware year =====
const formatDateDDMMYYYY = (ymd, locale) => {
  if (!ymd) return "-";

  const date = new Date(ymd);
  const isTH = locale?.startsWith("th");

  const parts = new Intl.DateTimeFormat(isTH ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const day = parts.find(p => p.type === "day")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const year = parts.find(p => p.type === "year")?.value;

  return `${day}-${month}-${year}`;
};

export default function SpecialHolidaysCard() {
  const {
    formOpen,
    setFormOpen,
    editId,
    holidayName,
    setHolidayName,
    holidayStart,
    setHolidayStart,
    holidayEnd,
    setHolidayEnd,
    openAddForm,
    resetHolidayForm,
    sortedSpecialHolidays,
    onEditHoliday,
    onDeleteHoliday,
    upsertSpecialHoliday,
  } = useHolidayPolicy();
const { t , i18n } = useTranslation();
  // =========================
  // Pagination (5 per page)
  // =========================
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => {
    const total = sortedSpecialHolidays?.length || 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [sortedSpecialHolidays]);

  // ถ้าจำนวนรายการเปลี่ยน (เพิ่ม/ลบ) แล้วหน้าเกิน ให้ดึงกลับ
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedHolidays = useMemo(() => {
    const list = sortedSpecialHolidays || [];
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [sortedSpecialHolidays, page]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goPrev = () => canPrev && setPage((p) => p - 1);
  const goNext = () => canNext && setPage((p) => p + 1);
  const goTo = (n) => setPage(Math.min(Math.max(1, n), totalPages));

  // แสดงเลขหน้าแบบไม่รก: 1 ... 4 5 6 ... 20
  const pageNumbers = useMemo(() => {
    const maxButtons = 5; // จำนวนปุ่มตัวเลขที่อยากโชว์
    const pages = [];

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // center around current page
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + (maxButtons - 1));

    // fix if near end
    start = Math.max(1, end - (maxButtons - 1));

    // always show 1 and last with ellipsis
    if (start > 1) pages.push(1);
    if (start > 2) pages.push("...");

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages - 1) pages.push("...");
    if (end < totalPages) pages.push(totalPages);

    return pages;
  }, [page, totalPages]);

  const LANGS = [
    { key: "th", label: "" }, // i18n: language.th
    { key: "en", label: "" }, // i18n: language.en
  ];

  return (
    <>
      {formOpen && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
                 {t("specialHoliday.title")}
              </div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {t("specialHoliday.subtitle")}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                resetHolidayForm();
              }}
              className="h-10 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
            >
              {t("specialHoliday.form.close")}
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  {t("specialHoliday.form.holidayName")}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LANGS.map((lang) => (
                    <input
                      key={lang.key}
                      value={holidayName?.[lang.key] || ""}
                      onChange={(e) =>
                        setHolidayName((prev) => ({
                          ...prev,
                          [lang.key]: e.target.value,
                        }))
                      }
                      placeholder={lang.key.toUpperCase()}
                      className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
          text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  {t("specialHoliday.form.startDate")}
                </label>
                <input
                  type="date"
                  value={holidayStart}
                  onChange={(e) => setHolidayStart(e.target.value)}
                  className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                    text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                   {t("specialHoliday.form.endDate")}
                </label>
                <input
                  type="date"
                  value={holidayEnd}
                  onChange={(e) => setHolidayEnd(e.target.value)}
                  className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                    text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                 {t("specialHoliday.form.duration")}:{" "}
                <span className="text-slate-700">
                  {calcTotalDays(holidayStart, holidayEnd) || 0} day(s)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetHolidayForm();
                      setFormOpen(false);
                    }}
                    className="h-11 px-6 rounded-3xl bg-white border border-gray-200 text-slate-700
                      font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                  >
                    {t("specialHoliday.form.cancelEdit")}
                  </button>
                )}

                <button
                  type="button"
                  onClick={upsertSpecialHoliday}
                  className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                    uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100
                    inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  {editId ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {t("specialHoliday.table.title")}
            </div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {t("specialHoliday.table.subtitle")}
            </div>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="h-10 px-4 rounded-3xl bg-white border border-gray-200 text-slate-800
              font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
              inline-flex items-center gap-2"
          >
            <Plus size={16} />
            {t("specialHoliday.action.addHoliday")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">{t("specialHoliday.table.date")}</th>
                <th className="px-6 py-4">{t("specialHoliday.table.name")}</th>
                <th className="px-6 py-4 text-right">{t("specialHoliday.table.actions")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sortedSpecialHolidays.length === 0 ? (
                <tr>
                 <td colSpan={3} className="py-10 text-center text-gray-400">
                  {t("specialHoliday.table.empty")}
                </td>
                </tr>
              ) : (
                pagedHolidays.map((h) => {
                  const totalDays = calcTotalDays(h.startDate, h.endDate);
                  const dateText =
  safeYMD(h.startDate) === safeYMD(h.endDate)
    ? `${formatDateDDMMYYYY(h.startDate, i18n.language)} (${totalDays} day)`
    : `${formatDateDDMMYYYY(h.startDate, i18n.language)} - ${formatDateDDMMYYYY(
        h.endDate,
        i18n.language
      )} (${totalDays} days)`;


                  const getHolidayDisplayName = (name, lang) => {
  if (!name) return "-";
  if (typeof name === "string") return name; // ข้อมูลเก่า

  // normalize lang เช่น en-US → en
  const key = lang?.split("-")[0];

  return (
    name[key] ||          // ภาษาที่เลือก
    name.th ||             // fallback 1
    name.en ||             // fallback 2
    "-"
  );
};


                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-black text-slate-700">
                        {dateText}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-bold">
  {getHolidayDisplayName(h.name, i18n.language)}
</td>


                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEditHoliday(h)}
                            className="h-9 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                              font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
                              inline-flex items-center gap-2"
                          >
                            <Pencil size={14} />
                            {t("specialHoliday.action.edit")}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteHoliday(h)}
                            className="h-9 px-4 rounded-3xl border border-rose-100 bg-rose-50 text-rose-700
                              font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95
                              inline-flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                             {t("specialHoliday.action.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {sortedSpecialHolidays.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {t("specialHoliday.pagination.page")} {page} / {totalPages} • {t("specialHoliday.pagination.showing")}{" "}
              <span className="text-slate-700">
                {Math.min(
                  (page - 1) * PAGE_SIZE + 1,
                  sortedSpecialHolidays.length
                )}
                -{Math.min(page * PAGE_SIZE, sortedSpecialHolidays.length)}
              </span>{" "}
              {t("specialHoliday.pagination.of")}{" "}
              <span className="text-slate-700">
                {sortedSpecialHolidays.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canPrev}
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                  ${
                    canPrev
                      ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
              >
                <ChevronLeft size={14} />
                {t("specialHoliday.pagination.prev")}
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`dots-${idx}`}
                      className="px-2 text-gray-300 font-black text-[12px]"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goTo(p)}
                      className={`h-9 min-w-[38px] px-3 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95
                        ${
                          p === page
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                        }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                  ${
                    canNext
                      ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
              >
                {t("specialHoliday.pagination.next")}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
