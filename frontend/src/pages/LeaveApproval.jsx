import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  getPendingLeaves,
  updateLeaveStatus,
  grantSpecialLeave,
} from "../api/leaveService";
import {
  CheckSquare,
  Square,
  Trash2,
  Image as ImageIcon,
  MessageCircle,
  Info,
  Clock,
  FileX,    
  FilePlus, 
} from "lucide-react";
import {
  alertConfirm,
  alertSuccess,
  alertError,
  alertRejectReason,
} from "../utils/sweetAlert";
import { openAttachment } from "../utils/attachmentPreview";

export default function LeaveApproval() {
  const { t, i18n } = useTranslation();

  const [requests, setRequests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState("new");

  const API_BASE = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  ).replace(/\/$/, "");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getPendingLeaves();
      setRequests(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (err) {
      alertError(t("common.error"), err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const { newRequests, cancelRequests } = useMemo(() => {
    return {
      newRequests: requests.filter((r) => r.status === "Pending"),
      cancelRequests: requests.filter((r) => r.status === "Withdraw_Pending"),
    };
  }, [requests]);

  const currentList = activeTab === "new" ? newRequests : cancelRequests;

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentList.length && currentList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map((r) => r.id));
    }
  };

  const handleAction = async (mode, singleReq = null) => {
    const targets = singleReq
      ? [singleReq]
      : requests.filter((r) => selectedIds.includes(r.id)); 

    if (targets.length === 0)
      return alertError(
        t("leaveApproval.selectionEmptyTitle"),
        t("leaveApproval.selectionEmptyText")
      );

    let actionText = "";
    if (activeTab === "cancel") {
        actionText = mode === "Approved" 
            ? "Approve Cancellation (Void Leave)" 
            : "Reject Cancellation (Keep Leave)";
    } else {
        actionText =
        mode === "Special"
            ? t("leaveApproval.actionText.special")
            : mode === "Approved"
            ? t("leaveApproval.actionText.approve")
            : t("leaveApproval.actionText.reject");
    }

    let rejectionReason = null;
    if (mode === "Rejected") {
      rejectionReason = await alertRejectReason();
      if (!rejectionReason) return;
    }

    const confirmed = await alertConfirm(
      t("leaveApproval.confirmTitle", { action: actionText }),
      t("leaveApproval.confirmText", {
        count: targets.length,
        action: actionText,
      })
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      for (const req of targets) {
        if (mode === "Special") {
          await grantSpecialLeave({
            employeeId: req.employeeId,
            amount: req.totalDaysRequested,
            reason: `Special Case Approval for: ${req.reason || "-"}`,
            year: new Date(req.startDate).getFullYear(),
            leaveRequestId: req.id,
          });
        } else {
          await updateLeaveStatus(
            req.id,
            mode,
            mode === "Rejected" ? rejectionReason : null
          );
        }
      }

      await alertSuccess(
        t("common.success"),
        t("leaveApproval.processed", { count: targets.length })
      );
      fetchRequests();
    } catch (err) {
      alertError(
        t("leaveApproval.actionFailed"),
        err?.response?.data?.error || err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const buildFileUrl = (pathOrUrl) => {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${API_BASE}${
      pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`
    }`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800">
          <Clock className="text-orange-500" />
          {t("leaveApproval.title")}
        </h1>

        {/* Action Buttons */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[10px] font-black text-slate-400 mr-2 uppercase bg-slate-100 px-3 py-1 rounded-full">
              {t("leaveApproval.selected", { count: selectedIds.length })}
            </span>
            
            <button
              onClick={() => handleAction("Approved")}
              className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-emerald-600 shadow-lg shadow-emerald-100 active:scale-95 transition-all"
            >
              {activeTab === 'cancel' ? "Approve Cancel" : t("leaveApproval.bulkApprove")}
            </button>

            {activeTab === "new" && (
                <button
                onClick={() => handleAction("Special")}
                className="bg-purple-600 text-white px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-purple-700 shadow-lg shadow-purple-100 active:scale-95 flex items-center gap-1 transition-all"
                >
                {t("leaveApproval.bulkSpecial")}
                </button>
            )}

            <button
              onClick={() => handleAction("Rejected")}
              className="bg-slate-200 text-slate-500 p-2 rounded-2xl hover:bg-rose-100 hover:text-rose-600 transition-all"
              title={activeTab === 'cancel' ? "Reject Cancel (Keep Leave)" : "Reject Leave"}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ✅ 5. Tabs Section (Pill Style like EmployeeList) */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => { setActiveTab("new"); setSelectedIds([]); }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "new"
              ? "bg-white text-blue-600 shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <FilePlus size={18} />
          {t("leaveApproval.newrequest")} ({newRequests.length})
        </button>

        <button
          onClick={() => { setActiveTab("cancel"); setSelectedIds([]); }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "cancel"
              ? "bg-white text-rose-600 shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <FileX size={18} />
          {t("leaveApproval.cancellationRequests")} ({cancelRequests.length})
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-gray-100">
              <tr>
                <th className="p-5 w-12 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-300 hover:text-blue-500 transition-all"
                  >
                    {selectedIds.length === currentList.length &&
                    currentList.length > 0 ? (
                      <CheckSquare size={20} className="text-blue-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                  {t("leaveApproval.table.employee")}
                </th>
                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                  {t("leaveApproval.table.type")}
                </th>
                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                  {activeTab === 'cancel' ? "Cancel Reason" : t("leaveApproval.table.reason")}
                </th>
                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                  {t("leaveApproval.table.duration")}
                </th>
                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                  {t("leaveApproval.table.evidence")}
                </th>
                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                  {t("leaveApproval.table.action")}
                </th>
              </tr>
            </thead>

            {/* Render List */}
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center font-black italic text-blue-500 animate-pulse">
                    {t("leaveApproval.loading")}
                  </td>
                </tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center text-slate-300 font-black uppercase text-sm">
                    {t("leaveApproval.noData")}
                  </td>
                </tr>
              ) : (
                currentList.map((req) => (
                  <tr
                    key={req.id}
                    className={`transition-all duration-300 ${
                      selectedIds.includes(req.id)
                        ? "bg-blue-50/50"
                        : "hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-5 text-center">
                      <button
                        onClick={() => toggleSelect(req.id)}
                        className={`transition-all ${
                          selectedIds.includes(req.id)
                            ? "text-blue-600 scale-110"
                            : "text-slate-200 hover:text-slate-400"
                        }`}
                      >
                        {selectedIds.includes(req.id) ? (
                          <CheckSquare size={20} />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                    </td>

                    {/* Employee */}
                    <td className="p-5 min-w-[180px]">
                      <div className="font-black text-slate-700 leading-none tracking-tight">
                        {req.employee?.firstName} {req.employee?.lastName}
                      </div>
                      <div className="text-[9px] font-black text-slate-300 uppercase mt-1">
                        Ref: #{req.id}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="p-5">
                      <span className="inline-block bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                        {req.leaveType?.typeName}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="p-5 min-w-[200px]">
                      <div className="flex flex-col gap-1">
                        {activeTab === 'cancel' && req.cancelReason && (
                             <div className="flex items-start gap-1 text-rose-600 text-[11px] leading-tight font-bold" title={`Cancel Reason: ${req.cancelReason}`}>
                                <MessageCircle size={12} className="mt-0.5 shrink-0 text-rose-500" />
                                <span className="truncate max-w-[180px]">{req.cancelReason}</span>
                             </div>
                        )}

                        {req.reason && (
                          <div
                            className={`flex items-start gap-1 text-[11px] leading-tight ${activeTab === 'cancel' ? 'text-slate-400' : 'text-slate-500'}`}
                            title={`Reason: ${req.reason}`}
                          >
                            <MessageCircle size={12} className="mt-0.5 shrink-0 opacity-50" />
                            <span className="truncate max-w-[180px]">{req.reason}</span>
                          </div>
                        )}

                        {req.note && (
                          <div className="flex items-start gap-1 text-amber-600 text-[11px] leading-tight" title={`Note: ${req.note}`}>
                            <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                            <span className="truncate max-w-[180px]">{req.note}</span>
                          </div>
                        )}

                        {!req.reason && !req.note && !req.cancelReason && (
                          <span className="text-slate-300 text-[10px] italic">-</span>
                        )}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="p-5">
                      <div className="text-[11px] font-bold text-slate-500 italic whitespace-nowrap">
                        {new Date(req.startDate).toLocaleDateString(i18n.language.startsWith("th") ? "th-TH" : "en-EN")}
                        {" - "}
                        {new Date(req.endDate).toLocaleDateString(i18n.language.startsWith("th") ? "th-TH" : "en-EN")}
                      </div>
                      <div className="font-black text-slate-800 text-sm mt-0.5">
                        {req.totalDaysRequested} {t("leaveApproval.days")}
                      </div>
                    </td>

                    {/* Evidence */}
                    <td className="p-5 text-center">
                      {req.attachmentUrl ? (
                        <button
                          onClick={() => openAttachment(buildFileUrl(req.attachmentUrl))}
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

                    {/* Action */}
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleAction("Approved", req)}
                          className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-100"
                          title={activeTab === 'cancel' ? "Approve Cancellation" : "Approve Leave"}
                        >
                          <span className="text-sm font-medium">
                            {t("leaveApproval.actions.approve")}
                          </span>
                        </button>

                        {activeTab === 'new' && (
                            <button
                            onClick={() => handleAction("Special", req)}
                            className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-purple-100"
                            title="Special Approval"
                            >
                            <span className="text-sm font-medium">
                                {t("leaveApproval.actions.special")}
                            </span>
                            </button>
                        )}

                        <button
                          onClick={() => handleAction("Rejected", req)}
                          className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100"
                          title={activeTab === 'cancel' ? "Reject Cancellation" : "Reject Leave"}
                        >
                          <span className="text-sm font-medium">
                            {t("leaveApproval.actions.reject")}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}