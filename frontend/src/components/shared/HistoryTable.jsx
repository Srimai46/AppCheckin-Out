import React, { useState, useMemo } from "react";
import { History, FileText, Image as ImageIcon } from "lucide-react";
import { openAttachment } from "../../utils/attachmentPreview";

const PAGE_SIZE = 10;
const SHIFT_START = "09:00"; // ✅ เวลาเริ่มงาน

export default function HistoryTable({
  activeTab,
  setActiveTab,
  attendanceData = [],
  leaveData = [],
  buildFileUrl,
}) {
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
    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) return "-";

    const ms = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.round((e - s) / ms) + 1);
  };

  // ===================== ✅ LATE CALC (Frontend Override) =====================
  const toMinutes = (hhmm) => {
    if (!hhmm) return null;
    const s = String(hhmm).trim();

    // รองรับ "09:05", "09:05:00", หรือ ISO date string
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
    // เอาเวลา check-in ที่มีจริงมากที่สุด
    const inRaw =
      row?.checkInTimeDisplay ||
      row?.checkIn ||
      row?.checkInTime ||
      row?.checkInTimeISO ||
      null;

    const inM = toMinutes(inRaw);
    const startM = toMinutes(SHIFT_START);
    if (inM == null || startM == null) return false;

    // ✅ เกิน 09:00 ถือว่า Late (09:00 = on time)
    return inM > startM;
  };

  const normalizeAttendanceStatus = (status) => {
    const s = String(status || "").trim().toLowerCase();
    if (!s) return ""; // ว่าง
    if (s === "late" || s === "สาย") return "Late";
    if (s === "on time" || s === "ontime" || s === "ตรงเวลา") return "On Time";
    return status; // อย่างอื่น
  };
  // ==========================================================================

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
            {activeTab === "attendance" ? "Attendance Log" : "Leave History"}
          </h2>
        </div>

        <div className="flex bg-gray-50 border border-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
              activeTab === "attendance"
                ? "bg-white shadow-sm text-slate-800"
                : "text-gray-400"
            }`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
              activeTab === "leave"
                ? "bg-white shadow-sm text-slate-800"
                : "text-gray-400"
            }`}
          >
            Leave
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
            {activeTab === "attendance" ? (
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">In / Out</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4 text-center">Days</th>
                <th className="px-6 py-4">Note</th>
                <th className="px-6 py-4 text-center">File</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            )}
          </thead>

          <tbody className="text-[11px] font-bold uppercase">
            {activeTab === "attendance" ? (
              pagedData.length > 0 ? (
                pagedData.map((row, i) => {
                  const late = isLateByRow(row);
                  const statusFromApi = normalizeAttendanceStatus(
                    row.status || row.statusDisplay
                  );

                  // ✅ override: ถ้าเวลาเกิน 09:00 ให้ Late เสมอ
                  const statusLabel = late ? "Late" : statusFromApi || "On Time";

                  const statusClass = late
                    ? "bg-rose-50 text-rose-600 border-rose-100"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100";

                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50/30"
                    >
                      <td className="px-6 py-4 text-slate-600">
                        {row.date || row.dateDisplay}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-emerald-600">
                          {row.checkIn || row.checkInTimeDisplay || "--:--"}
                        </span>
                        <span className="mx-2 text-gray-300">/</span>
                        <span className="text-rose-500">
                          {row.checkOut || row.checkOutTimeDisplay || "--:--"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg border ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="p-10 text-center text-gray-300 italic"
                  >
                    No Data
                  </td>
                </tr>
              )
            ) : pagedData.length > 0 ? (
              pagedData.map((leave, i) => {
                const days = calcLeaveDays(leave);
                const note = leave.note || leave.reason || leave.remark || "-";

                return (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50/30"
                  >
                    <td className="px-6 py-4">
                      <div className="text-slate-800">
                        {leave.leaveType?.typeName || leave.type}
                      </div>
                      <div className="text-[9px] text-gray-400 font-black">
                        {days} Days
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
                          onClick={() =>
                            openAttachment(buildFileUrl(leave.attachmentUrl))
                          }
                          className="bg-indigo-100 text-indigo-700 p-2 rounded-xl active:scale-95 transition-all"
                        >
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
                <td
                  colSpan="6"
                  className="p-10 text-center text-gray-300 italic"
                >
                  No Data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
