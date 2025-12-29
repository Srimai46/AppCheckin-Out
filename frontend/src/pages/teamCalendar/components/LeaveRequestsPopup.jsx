// frontend/src/pages/LeaveApproval.jsx
import { useState, useEffect } from "react";
import { getPendingLeaves, updateLeaveStatus, grantSpecialLeave } from "../api/leaveService";
import { Clock } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";
import { openAttachment } from "../utils/attachmentPreview";

// ✅ popup shared from TeamCalendar style
import LeaveRequestsPopup from "./teamCalendar/components/LeaveRequestsPopup";

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Popup states
  const [popupOpen, setPopupOpen] = useState(true);
  const [popupTab, setPopupTab] = useState("PENDING"); // PENDING | APPROVED | REJECTED
  const [popupRoleFilter, setPopupRoleFilter] = useState("ALL"); // ALL | HR | WORKER
  const [popupRoleOpen, setPopupRoleOpen] = useState(false);
  const [popupSearch, setPopupSearch] = useState("");

  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

  const buildFileUrl = (pathOrUrl) => {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${API_BASE}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getPendingLeaves();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      alertError("Failed to Load Data", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ✅ action for popup row (single)
  const handleActionSingle = async (mode, req) => {
    if (!req) return;

    const actionText =
      mode === "Special"
        ? "Special Approval (Non-deductible)"
        : mode === "Approved"
        ? "Normal Approve"
        : "Reject";

    const confirmed = await alertConfirm(
      `Confirm ${actionText}`,
      `Process request of <b>${req?.employee?.firstName || ""} ${req?.employee?.lastName || ""}</b> as <b>${actionText}</b>?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);

      if (mode === "Special") {
        await grantSpecialLeave({
          employeeId: req.employeeId,
          amount: req.totalDaysRequested,
          reason: `Special Case Approval for: ${req.reason || "No reason"}`,
          year: new Date(req.startDate).getFullYear(),
          leaveRequestId: req.id,
        });
      } else {
        await updateLeaveStatus(req.id, mode);
      }

      await alertSuccess("Success", `Processed 1 request.`);
      await fetchRequests();
    } catch (err) {
      alertError("Action Failed", err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ rows for popup (ตาม tab)
  const popupRows =
    popupTab === "PENDING"
      ? (requests || []).map((r) => ({
          ...r,
          onOpenAttachment: (url) => openAttachment(buildFileUrl(url)),
        }))
      : []; // (ตอนนี้ยังไม่มี API approved/rejected)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800">
          <Clock className="text-orange-500" /> Leave Approval
        </h1>

        <button
          onClick={() => setPopupOpen(true)}
          className="h-11 px-5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black text-[11px] uppercase tracking-widest"
        >
          Open Popup
        </button>
      </div>

      <LeaveRequestsPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        tab={popupTab}
        setTab={setPopupTab}
        roleFilter={popupRoleFilter}
        setRoleFilter={setPopupRoleFilter}
        roleOpen={popupRoleOpen}
        setRoleOpen={setPopupRoleOpen}
        search={popupSearch}
        setSearch={setPopupSearch}
        loading={loading}
        rows={popupRows}
        onAction={handleActionSingle}
      />
    </div>
  );
}
