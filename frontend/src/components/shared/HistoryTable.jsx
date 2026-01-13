// frontend/src/components/shared/HistoryTable.jsx
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
import DateGridPicker from "../shared/DateGridPicker";
import api from "../../api/axios";
import {
  alertConfirm,
  alertSuccess,
  alertError,
  alertCancelReason,
} from "../../utils/sweetAlert";

const PAGE_SIZE = 5;

// ===================== ✅ Config Status & Badges =====================
const CHECKIN_BADGE = {
  ON_TIME: {
    labelKey: "history.onTime",
    cls: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  LATE: {
    labelKey: "history.late",
    cls: "bg-amber-50 text-amber-700 border-amber-100",
  },
  LEAVE: {
    labelKey: "history.leave",
    cls: "bg-blue-50 text-blue-700 border-blue-100",
  },
  ABSENT: {
    labelKey: "history.absent",
    cls: "bg-rose-50 text-rose-600 border-rose-100",
  },
};

const CHECKOUT_BADGE = {
  NORMAL: {
    labelKey: "history.normal",
    cls: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  EARLY: {
    labelKey: "history.early",
    cls: "bg-orange-50 text-orange-700 border-orange-100",
  },
  LEAVE: {
    labelKey: "history.leave",
    cls: "bg-blue-50 text-blue-700 border-blue-100",
  },
  NO_CHECKOUT: {
    labelKey: "history.noCheckout",
    cls: "bg-rose-50 text-rose-600 border-rose-100",
  },
  NOT_YET: {
    labelKey: "history.notCheckedOutYet",
    cls: "bg-gray-50 text-gray-400 border-gray-100",
  },
};

function StatusTextPill({ map, value }) {
  const { t } = useTranslation();
  const item = map?.[value] || map?.["NORMAL"];

  if (!value || !map[value]) return <span className="text-gray-300">-</span>;

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-2xl border text-[10px] font-black uppercase ${item.cls}`}
    >
      {t(item.labelKey)}
    </span>
  );
}

// ===================== Helpers =====================
const formatDateYMD = (dateLike) => {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-CA");
};

const formatTimeHMS = (dateLike) => {
  if (!dateLike) return "--:--";
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const timeToMinutes = (value) => {
  if (value == null) return null;
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.getHours() * 60 + value.getMinutes();

  const s = String(value).trim();
  if (!s) return null;

  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  const d = new Date(s.replace(" ", "T"));
  if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();

  return null;
};

export default function HistoryTable({
  activeTab,
  setActiveTab,
  attendanceData = [],
  leaveData = [],
  buildFileUrl,
  onDeletedLeaveSuccess,
  workEndTime,
}) {
  const { t } = useTranslation();

  const pad2 = (n) => String(n).padStart(2, "0");

  // ===================== Leave Status Badge =====================
  const getLeaveStatusStyle = (status) => {
    const config = {
      approved: {
        cls: "bg-emerald-50 text-emerald-600 border-emerald-100",
        label: t("leaveApproval.status.approved", "Approved"),
      },
      rejected: {
        cls: "bg-rose-50 text-rose-600 border-rose-100",
        label: t("leaveApproval.status.rejected", "Rejected"),
      },
      cancelled: {
        cls: "bg-slate-50 text-slate-600 border-slate-100",
        label: t("leaveApproval.status.cancelled", "Cancelled"),
      },
      withdraw: {
        cls: "bg-slate-50 text-slate-600 border-slate-100",
        label: t("leaveApproval.status.withdraw", "Withdraw"),
      },
      // ✅ ให้ withdraw_pending แสดงเป็น withdraw ตาม requirement
      withdraw_pending: {
        cls: "bg-slate-50 text-slate-600 border-slate-100",
        label: t("leaveApproval.status.withdraw", "Withdraw"),
      },
      pending: {
        cls: "bg-amber-50 text-amber-600 border-amber-100",
        label: t("leaveApproval.status.pending", "Pending"),
      },
    };

    const s = String(status || "").toLowerCase();
    return config[s] || config.pending;
  };

  // ===================== Date Parsing =====================
  const parseAnyDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    const s = String(value).trim();
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;

    const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m1) return new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));

    const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));

    return null;
  };

  const getRowDate = (row) => {
    const raw =
      row?.date ||
      row?.dateDisplay ||
      row?.workDate ||
      row?.work_date ||
      row?.createdAt ||
      row?.checkIn ||
      null;
    return parseAnyDate(raw);
  };

  const getLeaveDate = (leave) => {
    const raw = leave?.startDate || leave?.createdAt || leave?.requestedAt || null;
    return parseAnyDate(raw);
  };

  // ===================== Pagination & Filter =====================
  const tab = activeTab || "attendance";
  const [page, setPage] = useState(1);
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterDay, setFilterDay] = useState("all");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    setPage(1);
    setFilterYear("all");
    setFilterMonth("all");
    setFilterDay("all");
  }, [tab]);

  const rawData = tab === "attendance" ? attendanceData : leaveData;

  const filteredData = useMemo(() => {
    const y = filterYear === "all" ? null : Number(filterYear);
    const m = filterMonth === "all" ? null : Number(filterMonth);
    const d = filterDay === "all" ? null : Number(filterDay);

    return (rawData || []).filter((item) => {
      const dateObj = tab === "attendance" ? getRowDate(item) : getLeaveDate(item);
      if (!dateObj || isNaN(dateObj.getTime())) return true;

      if (y != null && dateObj.getFullYear() !== y) return false;
      if (m != null && dateObj.getMonth() + 1 !== m) return false;
      if (d != null && dateObj.getDate() !== d) return false;

      return true;
    });
  }, [rawData, tab, filterYear, filterMonth, filterDay]);

  useEffect(() => setPage(1), [filterYear, filterMonth, filterDay]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pagedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const onPrev = () => canPrev && setPage((p) => p - 1);
  const onNext = () => canNext && setPage((p) => p + 1);
  const goTo = (n) => setPage(Math.min(Math.max(1, n), totalPages));

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

  // ===================== Normalization =====================
  const normalizeBool = (v) => {
    if (v === true || v === false) return v;
    if (v === 1 || v === 0) return Boolean(v);
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
    return undefined;
  };

  const isPlaceholderTime = (v) => {
    if (v == null) return true;
    const s = String(v).trim();
    if (!s) return true;
    const up = s.toUpperCase();
    return (
      up === "----" ||
      up === "--:--" ||
      up === "-" ||
      up === "N/A" ||
      up === "NULL" ||
      up === t("history.notCheckedOutYet")
    );
  };

  const normalizeInStatus = (s) => {
    const raw = String(s ?? "").trim();
    if (!raw) return "";
    if (raw === "ตรงเวลา") return "ON_TIME";
    if (raw === "สาย") return "LATE";
    if (raw === "ลา") return "LEAVE";
    if (raw === "ขาดงาน") return "ABSENT";
    return raw.toUpperCase().replace(/\s+/g, "_");
  };

  const normalizeOutStatus = (s) => {
    const raw = String(s ?? "").trim();
    if (!raw) return "";
    if (raw === "ออก") return "NORMAL";
    if (raw === "ออกก่อนเวลา") return "EARLY";
    if (raw === "ไม่เช็คเอาต์" || raw === "ไม่ได้กดออก") return "NO_CHECKOUT";
    if (raw === "ลา") return "LEAVE";

    const up = raw.toUpperCase().replace(/\s+/g, "_");
    if (up === "EARLY_OUT") return "EARLY";
    if (up === "CHECKED_OUT") return "NORMAL";
    return up;
  };

  // ===================== Status Logic =====================
  const computeCheckInStatus = (row) => {
    const sRaw = row?.checkInStatus || row?.check_in_status;
    const s = normalizeInStatus(sRaw);
    if (s && CHECKIN_BADGE[s]) return s;

    const inTime =
      row?.checkInTime ||
      row?.check_in_time ||
      row?.checkIn ||
      row?.checkInDisplay;

    const hasIn = !isPlaceholderTime(inTime);

    if (!hasIn) {
      if (row?.isLeave || row?.is_leave) return "LEAVE";
      return "ABSENT";
    }

    const late = normalizeBool(row?.isLate ?? row?.late ?? row?.is_late);
    if (late) return "LATE";

    return "ON_TIME";
  };

  const computeCheckOutStatus = (row) => {
    const sRaw = row?.checkOutStatus || row?.check_out_status;
    const s = normalizeOutStatus(sRaw);
    if (s && CHECKOUT_BADGE[s]) return s;

    if (row?.isLeave || row?.is_leave) return "LEAVE";

    const outTime =
      row?.checkOutTime ||
      row?.check_out_time ||
      row?.checkOut ||
      row?.checkOutDisplay;

    const hasOut = !isPlaceholderTime(outTime);

    if (!hasOut) return "NO_CHECKOUT";

    const expectedEnd =
      row?.workEndTime ||
      row?.endTime ||
      workEndTime ||
      null;

    const outMin = timeToMinutes(outTime);
    const endMin = timeToMinutes(expectedEnd);

    if (outMin != null && endMin != null) {
      if (outMin < endMin - 1) return "EARLY";
    }

    return "NORMAL";
  };

  // ===================== Leave Helpers =====================
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

  const getSignedBy = (leave) => {
    if (leave?.approverName) return leave.approverName;
    const a = leave?.approvedByHr;
    if (a?.firstName || a?.lastName)
      return `${a.firstName || ""} ${a.lastName || ""}`.trim();
    if (typeof leave?.approvedBy === "string") return leave.approvedBy;
    if (typeof leave?.rejectedBy === "string") return leave.rejectedBy;
    if (String(leave?.status || "").toLowerCase() === "pending") return "-";
    return "-";
  };

  // ===================== Actions =====================
  const handleDeleteLeave = async (leave) => {
    try {
      if (!leave?.id) return;

      const ok = await alertConfirm(
        t("history.deleteTitle"),
        t("history.deleteText", { type: leave.typeName || "Leave" }),
        t("history.deleteButton")
      );
      if (!ok) return;

      // ✅ FIX: ต้องเป็น /leaves (พหูพจน์) ให้ตรง backend
      const res = await api.delete(`/leaves/${leave.id}`);

      await alertSuccess(t("common.success"), t("leaveType.success.deleted"));
      onDeletedLeaveSuccess?.(res?.data?.data || leave);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t("common.deleteFailed");
      alertError(t("common.error"), msg);
    }
  };

  const handleRequestCancelLeave = async (leave) => {
    try {
      if (!leave?.id) return;

      const reason = await alertCancelReason();
      if (!reason) return;

      // ✅ FIX: ต้องเป็น /leaves/cancel/:id ให้ตรง backend
      const res = await api.post(`/leaves/cancel/${leave.id}`, {
        cancelReason: reason,
      });

      const updated = res?.data?.data;

      await alertSuccess(t("common.success"), t("leaveRequest.successTitle"));
      onDeletedLeaveSuccess?.(
        updated || { ...leave, cancelReason: reason, status: "Withdraw_Pending" }
      );
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t("common.systemError");
      alertError(t("common.error"), msg);
    }
  };

  // ===================== UI Strings =====================
  const isAll = filterYear === "all" && filterMonth === "all" && filterDay === "all";
  const displayDateText = useMemo(() => {
    if (isAll) return t("dateGridPicker.all");
    return `${pad2(filterDay)}/${pad2(filterMonth)}/${filterYear}`;
  }, [isAll, filterYear, filterMonth, filterDay, t]);

  const pickerValue = useMemo(() => {
    if (isAll) return null;
    return `${filterYear}-${pad2(filterMonth)}-${pad2(filterDay)}`;
  }, [filterYear, filterMonth, filterDay, isAll]);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {tab === "attendance" ? (
            <History size={18} className="text-blue-600" />
          ) : (
            <FileText size={18} className="text-amber-500" />
          )}
          <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">
            {tab === "attendance" ? t("history.attendanceLog") : t("history.leaveHistory")}
          </h2>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">
              {t("history.filter")}
            </span>

            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              className="h-9 px-4 rounded-2xl border border-gray-100 bg-white text-[11px] font-black text-slate-700 uppercase tracking-widest hover:bg-gray-50 transition active:scale-95"
            >
              {displayDateText}
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterYear("all");
                setFilterMonth("all");
                setFilterDay("all");
              }}
              className="h-9 px-4 rounded-2xl border border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition active:scale-95"
            >
              {t("history.clear")}
            </button>
          </div>

          <DateGridPicker
            open={datePickerOpen}
            value={pickerValue}
            onClose={() => setDatePickerOpen(false)}
            onChange={(dateStr) => {
              if (!dateStr) {
                setFilterYear("all");
                setFilterMonth("all");
                setFilterDay("all");
                return;
              }
              const [y, m, d] = String(dateStr).split("-");
              setFilterYear(y);
              setFilterMonth(m);
              setFilterDay(d);
            }}
            title={t("history.selectDate")}
            allowAll={true}
          />

          <div className="flex bg-gray-50 border border-gray-100 rounded-2xl p-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab?.("attendance")}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
                tab === "attendance"
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-gray-400"
              }`}
            >
              {t("history.tabAttendance")}
            </button>

            <button
              onClick={() => setActiveTab?.("leave")}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${
                tab === "leave"
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-gray-400"
              }`}
            >
              {t("history.tabLeave")}
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
            {tab === "attendance" ? (
              <tr>
                <th className="px-6 py-4">{t("history.date")}</th>
                <th className="px-6 py-4">{t("history.inOut")}</th>
                <th className="px-6 py-4 text-center">{t("history.statusIn")}</th>
                <th className="px-6 py-4 text-center">{t("history.statusOut")}</th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4">{t("history.type")}</th>
                <th className="px-6 py-4">{t("history.period")}</th>
                <th className="px-6 py-4 text-center">{t("history.days")}</th>
                <th className="px-6 py-4">{t("history.note")}</th>
                <th className="px-6 py-4 text-center">{t("history.file")}</th>
                <th className="px-6 py-4 text-center">{t("history.signedBy")}</th>
                <th className="px-6 py-4 text-center">{t("history.status")}</th>
                <th className="px-6 py-4 text-center">{t("leaveApproval.table.action")}</th>
              </tr>
            )}
          </thead>

          <tbody className="text-[11px] font-bold uppercase">
            {tab === "attendance" ? (
              pagedData.length > 0 ? (
                pagedData.map((row, i) => {
                  const workDate = getRowDate(row);

                  const checkInTime =
                    row?.checkInTime ||
                    row?.check_in_time ||
                    row?.checkIn ||
                    row?.checkInDisplay;

                  const checkOutTime =
                    row?.checkOutTime ||
                    row?.check_out_time ||
                    row?.checkOut ||
                    row?.checkOutDisplay;

                  const inTimeText =
                    checkInTime && !isPlaceholderTime(checkInTime)
                      ? String(checkInTime).includes(":") && !String(checkInTime).includes("T")
                        ? checkInTime
                        : formatTimeHMS(checkInTime)
                      : "--:--";

                  const outTimeText =
                    checkOutTime && !isPlaceholderTime(checkOutTime)
                      ? String(checkOutTime).includes(":") && !String(checkOutTime).includes("T")
                        ? checkOutTime
                        : formatTimeHMS(checkOutTime)
                      : t("history.notCheckedOutYet");

                  const inStatus = computeCheckInStatus(row);
                  const outStatus = computeCheckOutStatus(row);

                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30">
                      <td className="px-6 py-4 text-slate-600">{formatDateYMD(workDate)}</td>

                      <td className="px-6 py-4">
                        <span className="text-emerald-600">{inTimeText}</span>
                        <span className="mx-2 text-gray-300">/</span>
                        <span className="text-rose-500">{outTimeText}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <StatusTextPill map={CHECKIN_BADGE} value={inStatus} />
                      </td>

                      <td className="px-6 py-4 text-center">
                        <StatusTextPill map={CHECKOUT_BADGE} value={outStatus} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-300 italic">
                    {t("history.noData")}
                  </td>
                </tr>
              )
            ) : (
              // ================= LEAVE ROWS =================
              pagedData.length > 0 ? (
                pagedData.map((leave, i) => {
                  if (!leave) return null;

                  const days = calcLeaveDays(leave);

                  const note =
                    leave.reason ||
                    leave.note ||
                    leave.remark ||
                    (leave.cancelReason
                      ? `${t("leaveApproval.labels.cancelReason")}: ${leave.cancelReason}`
                      : null) ||
                    (leave.rejectionReason ? `Rejected: ${leave.rejectionReason}` : null) ||
                    "-";

                  const signedBy = getSignedBy(leave);
                  const statusStyle = getLeaveStatusStyle(leave.status);

                  const statusLower = String(leave.status || "").trim().toLowerCase();
                  const canDelete = statusLower === "pending";   // ✅ เฉพาะ pending เท่านั้น
                  const canCancel = statusLower === "approved";  // ✅ เฉพาะ approved เท่านั้น

                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30">
                      <td className="px-6 py-4">
                        <div className="text-slate-800 font-black">
                          {leave.typeName || leave.leaveType?.typeName || leave.type || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {leave?.startDate
                          ? new Date(leave.startDate).toLocaleDateString("en-GB")
                          : "-"}{" "}
                        -{" "}
                        {leave?.endDate
                          ? new Date(leave.endDate).toLocaleDateString("en-GB")
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-center text-slate-600 font-bold">{days}</td>

                      <td className="px-6 py-4 text-gray-500 normal-case max-w-xs truncate">{note}</td>

                      <td className="px-6 py-4 text-center">
                        {leave.attachmentUrl ? (
                          <button
                            onClick={() => openAttachment(buildFileUrl(leave.attachmentUrl))}
                            className="bg-indigo-100 text-indigo-700 p-2 rounded-xl active:scale-95 transition-all"
                            title={t("leaveApproval.tooltips.viewAttachment")}
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
                        <span className={`px-3 py-1.5 rounded-xl border-2 whitespace-nowrap ${statusStyle.cls}`}>
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* ✅ ACTION: Pending=Delete, Approved=Request Cancel, อื่นๆ = '-' (รวม Withdraw) */}
                      <td className="px-6 py-4 text-center">
                        {canDelete ? (
                          <div className="inline-flex items-center justify-center">
                            <button
                              onClick={() => handleDeleteLeave(leave)}
                              className="px-3 py-2 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition active:scale-95"
                            >
                              {t("common.delete")}
                            </button>
                          </div>
                        ) : canCancel ? (
                          <div className="inline-flex items-center justify-center">
                            <button
                              onClick={() => handleRequestCancelLeave(leave)}
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition active:scale-95"
                            >
                              {t("history.requestCancelButton")}
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
              )
            )}
          </tbody>
        </table>

        {/* Footer / Pagination */}
        {filteredData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {t("common.page")} {page} / {totalPages} • {t("common.showing")}{" "}
              <span className="text-slate-700">
                {Math.min((page - 1) * PAGE_SIZE + 1, filteredData.length)}-
                {Math.min(page * PAGE_SIZE, filteredData.length)}
              </span>{" "}
              {t("common.of")} <span className="text-slate-700">{filteredData.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!canPrev}
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95 ${
                  canPrev
                    ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                    : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                }`}
                title={t("common.prev")}
              >
                <ChevronLeft size={14} />
                {t("common.prev")}
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
                      className={`h-9 min-w-[38px] px-3 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
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
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95 ${
                  canNext
                    ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                    : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                }`}
                title={t("common.next")}
              >
                {t("common.next")}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
