import React, { useState, useMemo, useEffect } from "react";
import {
  History,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { openAttachment } from "../../utils/attachmentPreview";
import api from "../../api/axios";
import { alertConfirm, alertSuccess, alertError } from "../../utils/sweetAlert";

const PAGE_SIZE = 5;

export default function HistoryTable({
  activeTab,
  setActiveTab,
  attendanceData = [],
  leaveData = [],
  buildFileUrl,
  onDeletedLeaveSuccess,
}) {
  const { t } = useTranslation();

  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Rejected":
        return "bg-rose-50 text-rose-600 border-rose-100";
      case "Cancelled":
        return "bg-slate-50 text-slate-600 border-slate-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100"; // Pending / Withdraw_Pending etc.
    }
  };

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const data = activeTab === "attendance" ? attendanceData : leaveData;

  const totalPages = useMemo(() => {
    const total = data?.length || 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [data]);

  // ถ้าจำนวนรายการเปลี่ยน แล้วหน้าเกิน ให้ดึงกลับ
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (data || []).slice(start, start + PAGE_SIZE);
  }, [data, page]);

  // ===================== ✅ page number style (เหมือนที่ทำให้) =====================
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const pages = [];

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + (maxButtons - 1));
    start = Math.max(1, end - (maxButtons - 1));

    if (start > 1) pages.push(1);
    if (start > 2) pages.push("...");

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages - 1) pages.push("...");
    if (end < totalPages) pages.push(totalPages);

    return pages;
  }, [page, totalPages]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const onPrev = () => canPrev && setPage((p) => p - 1);
  const onNext = () => canNext && setPage((p) => p + 1);
  const goTo = (n) => setPage(Math.min(Math.max(1, n), totalPages));
  // ==============================================================================

  const calcLeaveDays = (leave) => {
    const raw = leave?.totalDaysRequested ?? leave?.days ?? leave?.totalDays;
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
    if (typeof row?.isLate === "boolean") return row.isLate;

    const start = row?.standardConfig?.start || "09:00";
    const inRaw =
      row?.checkInTimeDisplay ||
      row?.checkInDisplay ||
      row?.checkIn ||
      row?.checkInTime ||
      null;

    const inM = toMinutes(inRaw);
    const startM = toMinutes(start);
    if (inM == null || startM == null) return false;

    return inM > startM;
  };
  // ==========================================================================

  // ✅ Signed By (คนลงนาม)
  const getSignedBy = (leave) => {
    if (leave?.approverName) return leave.approverName;

    const a = leave?.approvedByHr;
    if (a?.firstName || a?.lastName) return `${a.firstName || ""} ${a.lastName || ""}`.trim();

    if (typeof leave?.approvedBy === "string") return leave.approvedBy;
    if (typeof leave?.rejectedBy === "string") return leave.rejectedBy;

    if (String(leave?.status || "").toLowerCase() === "pending") return "Waiting for HR";

    return "-";
  };

  // ✅ Delete (ใช้ cancel endpoint)
  const handleDeleteLeave = async (leave) => {
    try {
      if (!leave?.id) return;

      const ok = await alertConfirm(
        "Delete leave request?",
        `Are you sure you want to delete this request?<br/>
         <b>${leave?.leaveType?.typeName || leave?.type || "-"}</b>`,
        "Delete"
      );
      if (!ok) return;

      await api.post(`/leaves/cancel/${leave.id}`, {
        cancelReason: "User deleted request",
      });

      await alertSuccess("Deleted", "Leave request deleted successfully.");
      onDeletedLeaveSuccess?.(leave);
    } catch (err) {
      alertError(
        "Delete failed",
        err?.response?.data?.error || err?.response?.data?.message || err.message
      );
    }
  };

  const isPending = (status) => String(status || "").toLowerCase() === "pending";

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
            {activeTab === "attendance" ? t("history.attendanceLog") : t("history.leaveHistory")}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-50 border border-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
                activeTab === "attendance" ? "bg-white shadow-sm text-slate-800" : "text-gray-400"
              }`}
            >
              {t("history.tabAttendance")}
            </button>

            <button
              onClick={() => setActiveTab("leave")}
              className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
                activeTab === "leave" ? "bg-white shadow-sm text-slate-800" : "text-gray-400"
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
                <th className="px-6 py-4 text-center">Signed By</th>
                <th className="px-6 py-4 text-center">{t("history.status")}</th>
                <th className="px-6 py-4 text-center">Actions</th>
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
                      <td className="px-6 py-4 text-slate-600">{row.date || row.dateDisplay}</td>

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
                        <span className={`px-3 py-1 rounded-lg border ${statusClass}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-gray-300 italic">
                    {t("history.noData")}
                  </td>
                </tr>
              )
            ) : pagedData.length > 0 ? (
              pagedData.map((leave, i) => {
                if (!leave) return null;
                const days = calcLeaveDays(leave);
                const note = leave.note || leave.reason || leave.remark || "-";
                const signedBy = getSignedBy(leave);

                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30">
                    <td className="px-6 py-4">
                      <div className="text-slate-800">{leave.leaveType?.typeName || leave.type}</div>
                      <div className="text-[9px] text-gray-400 font-black">{t("history.usedDays", { days })}</div>
                    </td>

                    <td className="px-6 py-4 text-gray-500">
                      {new Date(leave.startDate).toLocaleDateString("th-TH")} -{" "}
                      {new Date(leave.endDate).toLocaleDateString("th-TH")}
                    </td>

                    <td className="px-6 py-4 text-center text-slate-600 font-bold">{days}</td>

                    <td className="px-6 py-4 text-gray-500 normal-case max-w-xs truncate">{note}</td>

                    <td className="px-6 py-4 text-center">
                      {leave.attachmentUrl ? (
                        <button
                          onClick={() => openAttachment(buildFileUrl(leave.attachmentUrl))}
                          className="bg-indigo-100 text-indigo-700 p-2 rounded-xl active:scale-95 transition-all"
                          title="View Attachment"
                        >
                          <ImageIcon size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-700 normal-case">
                        {signedBy}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1.5 rounded-xl border-2 ${getStatusStyle(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {isPending(leave.status) ? (
                        <div className="inline-flex items-center justify-center">
                          <button
                            onClick={() => handleDeleteLeave(leave)}
                            className="px-3 py-2 rounded-xl border border-rose-100 bg-rose-50 text-rose-700
                                      text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition active:scale-95"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-10 text-center text-gray-300 italic">
                  {t("history.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination (เหมือนที่ทำให้: Prev/Next + เลขหน้า + ...) */}
        {((data?.length || 0) > 0) && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Page {page} / {totalPages} • Showing{" "}
              <span className="text-slate-700">
                {Math.min((page - 1) * PAGE_SIZE + 1, data.length)}-{Math.min(page * PAGE_SIZE, data.length)}
              </span>{" "}
              of <span className="text-slate-700">{data.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!canPrev}
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                  ${
                    canPrev
                      ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                title="Prev"
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-300 font-black text-[12px]">
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
                onClick={onNext}
                disabled={!canNext}
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                  ${
                    canNext
                      ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                title="Next"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
