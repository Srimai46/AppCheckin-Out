import React, { useMemo, useState, useEffect } from "react";
import { X, Clock, CheckCircle2, XCircle, Star, Search, MessageSquareWarning } from "lucide-react";

export default function LeaveRequestsPopup({
  open,
  onClose,
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
  onAction,
}) {
  // -------------------- Guards --------------------
  const safeRows = Array.isArray(rows) ? rows : [];

  // -------------------- Reject Reason Modal states --------------------
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!open) {
      setRejectTarget(null);
      setRejectReason("");
    }
  }, [open]);

  // -------------------- Filtering --------------------
  const filteredRows = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();

    return safeRows.filter((r) => {
      const roleRaw = String(
        r?.employee?.role || r?.employee?.position || r?.role || r?.position || ""
      ).toUpperCase();

      if (roleFilter && roleFilter !== "ALL") {
        const want = roleFilter === "WORKER" ? "WORKER" : "HR";
        if (roleRaw !== want) return false;
      }

      if (!term) return true;

      const name = String(
        r?.employee?.fullName ||
          `${r?.employee?.firstName || ""} ${r?.employee?.lastName || ""}`.trim() ||
          r?.name ||
          ""
      ).toLowerCase();

      const email = String(r?.employee?.email || r?.email || "").toLowerCase();
      const id = String(r?.employeeId ?? r?.employee?.id ?? r?.id ?? "").toLowerCase();
      const type = String(r?.leaveType?.typeName || r?.type || "").toLowerCase();

      return name.includes(term) || email.includes(term) || id.includes(term) || type.includes(term);
    });
  }, [safeRows, roleFilter, search]);

  const buildName = (r) =>
    r?.employee?.fullName ||
    `${r?.employee?.firstName || ""} ${r?.employee?.lastName || ""}`.trim() ||
    r?.name ||
    "Unknown";

  const buildType = (r) => r?.leaveType?.typeName || r?.type || "-";

  const buildPeriod = (r) => {
    const s = r?.startDate ? new Date(r.startDate).toLocaleDateString("th-TH") : "-";
    const e = r?.endDate ? new Date(r.endDate).toLocaleDateString("th-TH") : "-";
    return `${s} - ${e}`;
  };

  const buildDays = (r) => {
    const raw = r?.totalDaysRequested ?? r?.days;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
    return "-";
  };

  const hasAttachment = (r) => !!r?.attachmentUrl;

  const handleClickReject = (row) => {
    setRejectTarget(row);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const reason = String(rejectReason || "").trim();
    if (!reason) return;

    await onAction?.("Rejected", { ...rejectTarget, rejectReason: reason });
    setRejectTarget(null);
    setRejectReason("");
  };

  // -------------------- UI --------------------
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
      {/* overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      {/* panel */}
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        {/* top bar */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">
                Leave Requests
              </div>
              <div className="mt-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {tab === "PENDING" ? "Pending approvals" : tab === "APPROVED" ? "Approved" : "Rejected"}
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

          {/* tabs + filters */}
          <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setTab?.("PENDING");
                  setRoleOpen?.(false);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-all
                  ${
                    tab === "PENDING"
                      ? "bg-white border-blue-300 ring-2 ring-blue-100 text-slate-900"
                      : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                  }`}
              >
                <Clock size={14} />
                Pending
              </button>

              <button
                onClick={() => {
                  setTab?.("APPROVED");
                  setRoleOpen?.(false);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-all
                  ${
                    tab === "APPROVED"
                      ? "bg-white border-emerald-300 ring-2 ring-emerald-100 text-slate-900"
                      : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                  }`}
              >
                <CheckCircle2 size={14} />
                Approved
              </button>

              <button
                onClick={() => {
                  setTab?.("REJECTED");
                  setRoleOpen?.(false);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-all
                  ${
                    tab === "REJECTED"
                      ? "bg-white border-rose-300 ring-2 ring-rose-100 text-slate-900"
                      : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                  }`}
              >
                <XCircle size={14} />
                Rejected
              </button>
            </div>

            {/* role filter + search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              <select
                value={roleFilter || "ALL"}
                onChange={(e) => setRoleFilter?.(e.target.value)}
                className="h-11 px-4 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-[11px] uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="ALL">All Roles</option>
                <option value="HR">HR</option>
                <option value="WORKER">Worker</option>
              </select>

              <div className="relative w-full sm:w-[340px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  value={search || ""}
                  onChange={(e) => setSearch?.(e.target.value)}
                  placeholder="Search name, email, ID..."
                  className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-[11px] outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-300 placeholder:font-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="p-4 sm:p-6 overflow-auto max-h-[calc(92vh-160px)]">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Employee</th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Type</th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Period</th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Days</th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Evidence</th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                      {tab === "PENDING" ? "Action" : "Status"}
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
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center text-slate-300 font-black uppercase text-sm">
                        No Data
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((leaf) => {
                      const name = buildName(leaf);
                      const type = buildType(leaf);
                      const period = buildPeriod(leaf);
                      const days = buildDays(leaf);

                      return (
                        <tr key={leaf.id} className="hover:bg-slate-50/50 transition-all duration-200">
                          <td className="p-5 min-w-[220px]">
                            <div className="font-black text-slate-700 leading-none tracking-tight">{name}</div>
                            <div className="text-[9px] font-black text-slate-300 uppercase mt-1">Ref: #{leaf.id}</div>
                          </td>

                          <td className="p-5">
                            <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-slate-100 text-slate-700">
                              {type}
                            </span>
                          </td>

                          <td className="p-5 min-w-[240px]">
                            <div className="text-[11px] font-bold text-slate-500 italic whitespace-nowrap">
                              {period}
                            </div>
                          </td>

                          <td className="p-5 text-center">
                            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] font-black text-slate-800">
                              {days}
                            </div>
                          </td>

                          <td className="p-5 text-center">
                            {hasAttachment(leaf) ? (
                              <button
                                onClick={() => leaf?.onOpenAttachment?.(leaf.attachmentUrl)}
                                className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all"
                                title="View Attachment"
                              >
                                <Star size={18} className="opacity-80" />
                              </button>
                            ) : (
                              <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest italic">
                                No File
                              </span>
                            )}
                          </td>

                          <td className="p-5 text-center min-w-[260px]">
                            {tab === "PENDING" ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => onAction?.("Approved", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-100 font-black text-[10px] uppercase tracking-widest"
                                  title="Approve"
                                >
                                  Approved
                                </button>

                                <button
                                  onClick={() => onAction?.("Special", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-purple-100 font-black text-[10px] uppercase tracking-widest"
                                  title="Special Approval"
                                >
                                  <Star size={14} />
                                  Special
                                </button>

                                <button
                                  onClick={() => handleClickReject(leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100 font-black text-[10px] uppercase tracking-widest"
                                  title="Reject"
                                >
                                  Rejected
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-700">
                                {tab}
                              </span>
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
            * Reject จะให้กรอกเหตุผลก่อนส่งคำสั่งไป backend
          </div>
        </div>
      </div>

      {/* ===================== ✅ Reject Reason Modal ===================== */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setRejectTarget(null);
              setRejectReason("");
            }}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black text-slate-900">Reject Reason</div>
                  <div className="mt-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {buildName(rejectTarget)} • Ref #{rejectTarget?.id}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setRejectTarget(null);
                    setRejectReason("");
                  }}
                  className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase tracking-widest mb-2">
                <MessageSquareWarning size={16} className="text-rose-500" />
                Reason (required)
              </label>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="กรอกเหตุผลที่ไม่อนุมัติ..."
                className="w-full h-28 p-3 border border-gray-200 rounded-2xl resize-none text-[12px] font-bold outline-none focus:ring-2 focus:ring-rose-200 placeholder:text-gray-300"
              />

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setRejectTarget(null);
                    setRejectReason("");
                  }}
                  className="h-10 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black text-[11px] uppercase tracking-widest"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmReject}
                  disabled={!String(rejectReason || "").trim()}
                  className={`h-10 px-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95
                    ${
                      !String(rejectReason || "").trim()
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                        : "bg-rose-600 text-white hover:bg-rose-700"
                    }`}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
