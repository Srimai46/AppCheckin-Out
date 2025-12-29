import React, { useState, useMemo } from "react";
import { History, FileText, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { openAttachment } from "../../utils/attachmentPreview";

const PAGE_SIZE = 10;
const SHIFT_START = "09:00";

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
  const data = activeTab === "attendance" ? attendanceData : leaveData;
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  const pagedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  const calcLeaveDays = (leave) => {
    const raw = leave?.totalDaysRequested ?? leave?.days;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;

    const s = leave?.startDate ? new Date(leave.startDate) : null;
    const e = leave?.endDate ? new Date(leave.endDate) : null;
    if (!s || !e || isNaN(s.getTime())) return "-";

    const ms = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.round((e - s) / ms) + 1);
  };

  // ===== Late Calc =====
  const toMinutes = (hhmm) => {
    if (!hhmm) return null;
    if (String(hhmm).includes("T")) {
      const d = new Date(hhmm);
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    }
    const m = String(hhmm).match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };

  const isLateByRow = (row) => {
    const inRaw =
      row?.checkInTimeDisplay ||
      row?.checkIn ||
      row?.checkInTime ||
      row?.checkInTimeISO ||
      null;

    const inM = toMinutes(inRaw);
    const startM = toMinutes(SHIFT_START);
    if (inM == null || startM == null) return false;
    return inM > startM;
  };
  // =====================

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

        <div className="flex bg-gray-50 border border-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase ${
              activeTab === "attendance"
                ? "bg-white shadow-sm text-slate-800"
                : "text-gray-400"
            }`}
          >
            {t("history.tabAttendance")}
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase ${
              activeTab === "leave"
                ? "bg-white shadow-sm text-slate-800"
                : "text-gray-400"
            }`}
          >
            {t("history.tabLeave")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
            {activeTab === "attendance" ? (
              <tr>
                <th className="px-6 py-4">{t("history.date")}</th>
                <th className="px-6 py-4">{t("history.inOut")}</th>
                <th className="px-6 py-4 text-center">
                  {t("history.status")}
                </th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4">{t("history.type")}</th>
                <th className="px-6 py-4">{t("history.period")}</th>
                <th className="px-6 py-4 text-center">
                  {t("history.days")}
                </th>
                <th className="px-6 py-4">{t("history.note")}</th>
                <th className="px-6 py-4 text-center">
                  {t("history.file")}
                </th>
                <th className="px-6 py-4 text-center">
                  {t("history.status")}
                </th>
              </tr>
            )}
          </thead>

          <tbody className="text-[11px] font-bold uppercase">
            {pagedData.length > 0 ? (
              activeTab === "attendance" ? (
                pagedData.map((row, i) => {
                  const late = isLateByRow(row);
                  const statusLabel = late
                    ? t("history.late")
                    : t("history.onTime");

                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-6 py-4">{row.date}</td>
                      <td className="px-6 py-4">
                        {row.checkIn || "--:--"} /{" "}
                        {row.checkOut || "--:--"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-lg border">
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                pagedData.map((leave, i) => {
                  const days = calcLeaveDays(leave);
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-6 py-4">
                        {leave.leaveType?.typeName || leave.type}
                        <div className="text-[9px] text-gray-400 font-black">
                          {t("history.usedDays", { days })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString()} -{" "}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">{days}</td>
                      <td className="px-6 py-4 normal-case">
                        {leave.note || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {leave.attachmentUrl && (
                          <button
                            onClick={() =>
                              openAttachment(
                                buildFileUrl(leave.attachmentUrl)
                              )
                            }
                          >
                            <ImageIcon size={16} />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-xl border ${getStatusStyle(
                            leave.status
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )
            ) : (
              <tr>
                <td
                  colSpan={activeTab === "attendance" ? 3 : 6}
                  className="p-10 text-center text-gray-300 italic"
                >
                  {t("history.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
