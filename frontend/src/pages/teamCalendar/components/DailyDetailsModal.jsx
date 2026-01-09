// src/pages/teamCalendar/components/DailyDetailsModal.jsx
import React, { useCallback } from "react";
import { format } from "date-fns";
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Image as ImageIcon,
  MessageCircle,
  Info,
} from "lucide-react";

import { updateLeaveStatus, grantSpecialLeave } from "../../../api/leaveService";
import {
  alertConfirm,
  alertSuccess,
  alertError,
  alertRejectReason,
} from "../../../utils/sweetAlert";
import { openAttachment } from "../../../utils/attachmentPreview";

import Pill from "./Pill";
import TabButton from "./TabButton";
import RoleDropdown from "./RoleDropdown";

import { buildRowName, buildDurationText, typeBadgeTheme } from "../utils";

export default function DailyDetailsModal({
  open,
  onClose,

  selectedDate,
  modalSummary,
  shiftDay,
  goToday,

  tab,
  setTab,

  roleFilter,
  setRoleFilter,
  roleOpen,
  setRoleOpen,

  search,
  setSearch,

  loading,
  rows,

  refetchLeaves,
}) {
  const handleLeaveActionInModal = useCallback(
    async (mode, leaf) => {
      if (!leaf?.id) return;

      const modeLower = String(mode || "").toLowerCase();
      const isReject = modeLower === "rejected" || modeLower === "reject";

      const actionText =
        mode === "Special"
          ? "Special Approval (Non-deductible)"
          : mode === "Approved"
          ? "Normal Approve"
          : "Reject";

      try {
        let rejectionReason = null;

        if (isReject) {
          if (typeof alertRejectReason !== "function") {
            throw new Error(
              "alertRejectReason is not a function (check import from ../utils/sweetAlert)"
            );
          }
          rejectionReason = await alertRejectReason();
          if (!rejectionReason) return; // cancelled
        } else {
          const ok = await alertConfirm(
            `Confirm ${actionText}`,
            `Process request of <b>${buildRowName(leaf)}</b> as <b>${actionText}</b>?`
          );
          if (!ok) return;
        }

        if (mode === "Special") {
          await grantSpecialLeave({
            employeeId: leaf.employeeId ?? leaf.employee?.id,
            amount: leaf.totalDaysRequested ?? 1,
            reason: `Special Case Approval for: ${leaf.reason || leaf.note || "No reason"}`,
            year: new Date(leaf.startDate).getFullYear(),
            leaveRequestId: leaf.id,
          });
        } else {
          const finalStatus = isReject ? "Rejected" : mode;
          await updateLeaveStatus(leaf.id, finalStatus, isReject ? rejectionReason : null);
        }

        await alertSuccess("Success", `Processed 1 request.`);
        await refetchLeaves?.();
      } catch (err) {
        alertError("Action Failed", err?.message || err?.response?.data?.message || "Unknown error");
        console.error(err);
      }
    },
    [refetchLeaves]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-[1500px] max-h-[94vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        {/* Top Bar */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 leading-none">
                Daily Details
              </div>
              <div className="mt-2 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {format(selectedDate, "dd MMMM yyyy")}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center"
              title="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Summary + Day Nav */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill
                color="bg-emerald-100 text-emerald-700"
                label="Checked In"
                value={modalSummary?.checkedIn ?? 0}
              />
              <Pill
                color="bg-rose-100 text-rose-700"
                label="Late"
                value={modalSummary?.late ?? 0}
              />
              <Pill
                color="bg-slate-100 text-slate-700"
                label="Absent"
                value={modalSummary?.absent ?? 0}
              />
              <Pill
                color="bg-sky-100 text-sky-700"
                label="On Leave"
                value={modalSummary?.onLeave ?? 0}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => shiftDay?.(-1)}
                className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
              >
                {"<"}
              </button>

              <button
                onClick={() => goToday?.()}
                className="h-11 px-5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
              >
                Today
              </button>

              <button
                onClick={() => shiftDay?.(1)}
                className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
              >
                {">"}
              </button>
            </div>
          </div>

          {/* Tabs + Filters */}
          <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TabButton
                active={tab === "PENDING"}
                onClick={() => {
                  setTab?.("PENDING");
                  setRoleOpen?.(false);
                }}
                label="Pending Approvals"
                icon={<Clock size={14} />}
              />
              <TabButton
                active={tab === "APPROVED"}
                onClick={() => {
                  setTab?.("APPROVED");
                  setRoleOpen?.(false);
                }}
                label="Approved"
                icon={<CheckCircle2 size={14} />}
              />
              <TabButton
                active={tab === "REJECTED"}
                onClick={() => {
                  setTab?.("REJECTED");
                  setRoleOpen?.(false);
                }}
                label="Rejected"
                icon={<XCircle size={14} />}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              <RoleDropdown
                value={roleFilter}
                onChange={setRoleFilter}
                open={roleOpen}
                setOpen={setRoleOpen}
                widthClass="w-full sm:w-[180px]"
                size="sm"
                labels={{ ALL: "All Roles", WORKER: "Worker", HR: "HR" }}
              />

              <input
                value={search || ""}
                onChange={(e) => setSearch?.(e.target.value)}
                placeholder="Search name, email, ID..."
                className="w-full sm:w-[320px] h-11 px-4 rounded-2xl bg-white border border-slate-200
                          text-slate-800 font-black text-[11px]
                          placeholder:text-slate-300 placeholder:font-black
                          outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="p-4 sm:p-6 overflow-auto max-h-[calc(92vh-240px)]">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      Employee
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      Type
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      Note/Reason
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      Duration
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                      Evidence
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                      {tab === "APPROVED" ? "Approved By" : tab === "REJECTED" ? "Rejected By" : "Action"}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center font-black italic text-blue-500 animate-pulse">
                        SYNCHRONIZING DATA...
                      </td>
                    </tr>
                  ) : (rows || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center text-slate-300 font-black uppercase text-sm">
                        No Data
                      </td>
                    </tr>
                  ) : (
                    (rows || []).map((leaf) => {
                      const name = buildRowName(leaf);
                      const type = String(leaf.type || "-");
                      const dur = buildDurationText(leaf);

                      const showHrName =
                        tab === "APPROVED"
                          ? leaf.approvedBy || leaf.actedByHrName || "-"
                          : tab === "REJECTED"
                          ? leaf.rejectedBy || leaf.actedByHrName || "-"
                          : null;

                      return (
                        <tr key={leaf.id} className="hover:bg-slate-50/50 transition-all duration-200">
                          {/* Employee */}
                          <td className="p-5 min-w-[200px]">
                            <div className="font-black text-slate-700 leading-none tracking-tight">{name}</div>
                            <div className="text-[9px] font-black text-slate-300 uppercase mt-1">
                              Ref: #{leaf.id}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="p-5">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${typeBadgeTheme(
                                type
                              )}`}
                            >
                              {type}
                            </span>
                          </td>

                          {/* Note/Reason */}
                          <td className="p-5 min-w-[260px]">
                            <div className="flex flex-col gap-1">
                              {leaf.reason && (
                                <div
                                  className="flex items-start gap-1 text-slate-500 text-[11px] leading-tight"
                                  title={`Reason: ${leaf.reason}`}
                                >
                                  <MessageCircle size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                  <span className="truncate max-w-[240px]">{leaf.reason}</span>
                                </div>
                              )}
                              {leaf.note && (
                                <div
                                  className="flex items-start gap-1 text-amber-600 text-[11px] leading-tight"
                                  title={`Note: ${leaf.note}`}
                                >
                                  <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                                  <span className="truncate max-w-[240px]">{leaf.note}</span>
                                </div>
                              )}
                              {!leaf.reason && !leaf.note && (
                                <span className="text-slate-300 text-[10px] italic">-</span>
                              )}
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="p-5 min-w-[220px]">
                            <div className="text-[11px] font-bold text-slate-500 italic whitespace-nowrap">
                              {dur.range}
                            </div>
                            <div className="font-black text-slate-800 text-sm mt-0.5">
                              {dur.days || "-"}
                            </div>
                          </td>

                          {/* Evidence */}
                          <td className="p-5 text-center">
                            {leaf.attachmentUrl ? (
                              <button
                                onClick={() => openAttachment(leaf.attachmentUrl)}
                                className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all group"
                                title="View Attachment"
                              >
                                <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                              </button>
                            ) : (
                              <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest italic">
                                No File
                              </span>
                            )}
                          </td>

                          {/* Action / HR Name */}
                          <td className="p-5 text-center min-w-[220px]">
                            {tab === "PENDING" ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleLeaveActionInModal("Approved", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-100"
                                  title="Approve"
                                >
                                  <span className="text-sm font-medium">Approved</span>
                                </button>

                                <button
                                  onClick={() => handleLeaveActionInModal("Special", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-purple-100"
                                  title="Special Approval"
                                >
                                  <Star size={16} />
                                  <span className="text-sm font-medium">Special</span>
                                </button>

                                <button
                                  onClick={() => handleLeaveActionInModal("Rejected", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100"
                                  title="Reject"
                                >
                                  <span className="text-sm font-medium">Rejected</span>
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-700">
                                {showHrName || "-"}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 text-[10px] text-slate-300 font-black uppercase tracking-widest">
            * Approved/Rejected tab will show HR name if backend provides approvedBy/rejectedBy.
          </div>
        </div>
      </div>
    </div>
  );
}
