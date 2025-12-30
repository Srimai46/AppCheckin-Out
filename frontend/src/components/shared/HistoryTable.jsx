import React, { useState, useMemo, useEffect } from "react";
import { History, FileText, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { openAttachment } from "../../utils/attachmentPreview";

const PAGE_SIZE = 5; // ✅ แสดง 5 รายการ/หน้า (ทั้ง Attendance และ Leave)

export default function HistoryTable({
  activeTab,
  setActiveTab,
  attendanceData = [],
  leaveData = [],
  buildFileUrl,
}) {
  const { t } = useTranslation();

  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Rejected":
        return "bg-rose-50 text-rose-600 border-rose-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const [page, setPage] = useState(1);

  // ✅ รีเซ็ตหน้าเมื่อสลับแท็บ
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const data = activeTab === "attendance" ? attendanceData : leaveData;

  const totalPages = Math.max(1, Math.ceil((data?.length || 0) / PAGE_SIZE));

  // ✅ กันกรณีข้อมูลลดลงแล้ว page เกิน totalPages
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (data || []).slice(start, start + PAGE_SIZE);
  }, [data, page]);

  const calcLeaveDays = (leave) => {
    const raw = leave?.totalDaysRequested ?? leave?.days;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;

    const s = leave?.startDate ? new Date(leave.startDate) : null;
    const e = leave?.endDate ? new Date(leave.endDate) : null;
    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) return "-";

    const ms = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.round((e - s) / ms) + 1);
  };

  // ===================== ✅ LATE (เชื่อ backend 100% ถ้ามี isLate) =====================
  const toMinutes = (value) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.getHours() * 60 + value.getMinutes();
    }

    const s = String(value).trim();
    if (s.includes("T")) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    }

    const m = s.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (Number.isNaN(h) || Number.isNaN(mm)) return null;
    return h * 60 + mm;
  };

  const isLateByRow = (row) => {
    // ✅ เชื่อ backend 100% ถ้ามี isLate
    if (typeof row?.isLate === "boolean") return row.isLate;
    // fallback เผื่อบาง endpoint ไม่ส่ง isLate
    const start = row?.standardConfig?.start || "09:00";
    const inRaw = row?.checkInTimeDisplay || row?.checkInDisplay || row?.checkIn || row?.checkInTime || null;

    const inM = toMinutes(inRaw);
    const startM = toMinutes(start);
    if (inM == null || startM == null) return false;

    // ✅ 09:00 = ตรงเวลา, 09:01 = สาย
    return inM > startM;
  };
  // ==========================================================================

  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {activeTab === "attendance" ? (
            <History size={18} className="text-blue-600" />
          ) : (
            <FileText size={18} className="text-amber-500" />
          )}
          <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">
            {activeTab === "attendance"
              ? t("history.attendanceLog")
              : t("history.leaveHistory")}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-gray-50 border border-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
                activeTab === "attendance"
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-gray-400"
              }`}
            >
              {t("history.tabAttendance")}
            </button>

            <button
              onClick={() => setActiveTab("leave")}
              className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
                activeTab === "leave"
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-gray-400"
              }`}
            >
              {t("history.tabLeave")}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
            {activeTab === "attendance" ? (
              <tr>
                <th className="px-6 py-4">{t("history.date")}</th>
                <th className="px-6 py-4">{t("history.inOut")}</th>
                <th className="px-6 py-4 text-center">{t("history.status")}</th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4">{t("history.type")}</th>
                <th className="px-6 py-4">{t("history.period")}</th>
                <th className="px-6 py-4 text-center">{t("history.days")}</th>
                <th className="px-6 py-4">{t("history.note")}</th>
                <th className="px-6 py-4 text-center">{t("history.file")}</th>
                <th className="px-6 py-4 text-center">{t("history.status")}</th>
              </tr>
            )}
          </thead>

          <tbody className="text-[11px] font-bold uppercase">
            {activeTab === "attendance" ? (
              pagedData.length > 0 ? (
                pagedData.map((row, i) => {
                  const late = isLateByRow(row);

                  const statusLabel = late ? t("history.late") : t("history.onTime");
                  const statusClass = late
                    ? "bg-rose-50 text-rose-600 border-rose-100"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100";

                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50/30"
                      title={row?.standardConfig?.start ? `Standard Start: ${row.standardConfig.start}` : ""}
                    >
                      <td className="px-6 py-4 text-slate-600">
                        {row.date || row.dateDisplay}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-emerald-600">
                          {row.checkIn || row.checkInDisplay || row.checkInTimeDisplay || "--:--"}
                        </span>
                        <span className="mx-2 text-gray-300">/</span>
                        <span className="text-rose-500">
                          {row.checkOut || row.checkOutDisplay || row.checkOutTimeDisplay || "--:--"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-lg border ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="p-10 text-center text-gray-300 italic">
                    {t("history.noData")}
                  </td>
                </tr>
              )
            ) : pagedData.length > 0 ? (
              pagedData.map((leave, i) => {
                const days = calcLeaveDays(leave);
                const note = leave.note || leave.reason || leave.remark || "-";

                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30">
                    <td className="px-6 py-4">
                      <div className="text-slate-800">
                        {leave.leaveType?.typeName || leave.type}
                      </div>
                      <div className="text-[9px] text-gray-400 font-black">
                        {t("history.usedDays", { days })}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-500">
                      {new Date(leave.startDate).toLocaleDateString("th-TH")} -{" "}
                      {new Date(leave.endDate).toLocaleDateString("th-TH")}
                    </td>

                    <td className="px-6 py-4 text-center text-slate-600 font-bold">
                      {days}
                    </td>

                    <td className="px-6 py-4 text-gray-500 normal-case max-w-xs truncate">
                      {note}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {leave.attachmentUrl && (
                        <button
                          onClick={() => openAttachment(buildFileUrl(leave.attachmentUrl))}
                          className="bg-indigo-100 text-indigo-700 p-2 rounded-xl active:scale-95 transition-all"
                        >
                          <Image as={ImageIcon} />
                          <ImageIcon size={16} />
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1.5 rounded-xl border-2 ${getStatusStyle(
                          leave.status
                        )}`}
                      >
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-300 italic">
                  {t("history.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
              <div className="overflow-x-auto">
        <table className="w-full text-left">
        </table>
      </div>
      {/* ✅ Pagination */}
        <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={onPrev}
            disabled={page <= 1}
            className={`p-2 rounded-xl border text-slate-700 transition-all ${
              page <= 1
                ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
            title="Prev"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Page {page} / {totalPages}
          </div>

          <button
            onClick={onNext}
            disabled={page >= totalPages}
            className={`p-2 rounded-xl border text-slate-700 transition-all ${
              page >= totalPages
                ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
            title="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
