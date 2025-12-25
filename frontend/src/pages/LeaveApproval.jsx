import { useState, useEffect } from "react";
import { getPendingLeaves, updateLeaveStatus } from "../api/leaveService";
import { CheckCircle, XCircle, Clock, User, Image as ImageIcon } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";
import { openAttachment } from "../utils/attachmentPreview";

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

  const buildFileUrl = (pathOrUrl) => {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

    return `${API_BASE}${p}`;
  };

  // ดึงข้อมูล
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getPendingLeaves();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "An unexpected error occurred.";
      alertError("Failed to Load Data", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ฟังก์ชันกดปุ่ม
  const handleAction = async (id, status, req) => {
    const isApprove = status === "Approved";
    const actionText = isApprove ? "Approved" : "Rejected";

    const employeeName = req?.employee
      ? `${req.employee.firstName} ${req.employee.lastName}`
      : "Employee";
    const typeName = req?.leaveType?.typeName || "Leave";
    const period =
      req?.startDate && req?.endDate
        ? `${new Date(req.startDate).toLocaleDateString("th-TH")} - ${new Date(
            req.endDate
          ).toLocaleDateString("th-TH")}`
        : "-";

    const badgeStyle = (bg, fg) => `
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 14px;
      border-radius:9999px;
      background:${bg};
      color:${fg};
      font-weight:900;
      letter-spacing:0.08em;
      white-space:nowrap;
      line-height:1;
      min-width:110px;
      flex:0 0 auto;
    `;

    const badge = isApprove
      ? `<span style="${badgeStyle("#dcfce7", "#166534")}">APPROVE</span>`
      : `<span style="${badgeStyle("#fee2e2", "#991b1b")}">REJECT</span>`;

    const attachmentRow = req?.attachmentUrl
      ? `
        <div style="display:grid; grid-template-columns:110px 1fr; gap:8px 12px; margin-top:10px; font-size:14px">
          <div style="color:#94a3b8; font-weight:800"> Attachment </div>
          <div style="color:#0f172a; font-weight:900"> File attached </div>
        </div>
      `
      : "";

    const confirmed = await alertConfirm(
      `Confirm ${actionText}`,
      `
      <div style="text-align:left; line-height:1.65">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px">
          <div style="color:#64748b; font-weight:700">Please review the details before proceeding.</div>
          ${badge}
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:14px">
          <div style="display:grid; grid-template-columns:110px 1fr; gap:8px 12px; font-size:14px">
            <div style="color:#94a3b8; font-weight:800">Employee</div>
            <div style="color:#0f172a; font-weight:900">${employeeName}</div>

            <div style="color:#94a3b8; font-weight:800">Type</div>
            <div style="color:#0f172a; font-weight:800">${typeName}</div>

            <div style="color:#94a3b8; font-weight:800">Leave Date</div>
            <div style="color:#0f172a; font-weight:800">${period}</div>

            <div style="color:#94a3b8; font-weight:800">Days</div>
            <div style="color:#0f172a; font-weight:800">${req?.totalDaysRequested ?? "-"} Days</div>

            <div style="color:#94a3b8; font-weight:800">Reason</div>
            <div style="color:#334155; font-weight:700">${
              req?.reason ? req.reason : "<span style='color:#cbd5e1'>-</span>"
            }</div>
          </div>

          ${attachmentRow}
        </div>

        <div style="margin-top:10px; color:#64748b; font-size:12px">
          Click “Confirm ${actionText}” to complete this action.
        </div>
      </div>
      `,
      `Confirm${actionText}`
    );
    if (!confirmed) return;

    try {
      await updateLeaveStatus(id, status);
      await alertSuccess("Update Successful", `The ${actionText} action has been completed successfully.`);
      fetchRequests();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "An unexpected error occurred.";
      alertError("Update Failed", msg);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        <Clock className="text-orange-500" /> Pending Approvals (รายการรออนุมัติ)
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Employee</th>
              <th className="p-4 font-semibold text-gray-600">Type</th>
              <th className="p-4 font-semibold text-gray-600">Leave Date</th>
              <th className="p-4 font-semibold text-gray-600">Days</th>
              <th className="p-4 font-semibold text-gray-600">Note</th>
              <th className="p-4 font-semibold text-gray-600 text-center">File</th>
              <th className="p-4 font-semibold text-gray-600 text-center">Manage</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-400">
                  No pending requests.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <User size={16} className="text-gray-400" />
                      {req.employee?.firstName} {req.employee?.lastName}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                      {req.leaveType?.typeName || "-"}
                    </span>
                  </td>

                  <td className="p-4 text-sm">
                    {new Date(req.startDate).toLocaleDateString("th-TH")} -{" "}
                    {new Date(req.endDate).toLocaleDateString("th-TH")}
                  </td>

                  <td className="p-4 font-bold">{req.totalDaysRequested} Days</td>

                  <td className="p-4 text-gray-500 text-sm max-w-xs truncate">
                    {req.reason || "-"}
                  </td>

                  {/* ไฟล์แนบ */}
                  <td className="p-4 text-center">
                    {req.attachmentUrl ? (
                      <button
                        type="button"
                        onClick={() => openAttachment(buildFileUrl(req.attachmentUrl))}
                        className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200
                                   px-2 py-2 rounded-xl flex items-center gap-2
                                   text-sm font-bold transition mx-auto"
                        title="ดูไฟล์แนบ"
                      >
                        <ImageIcon size={16} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300 font-bold">-</span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleAction(req.id, "Approved", req)}
                        className="bg-green-100 text-green-600 hover:bg-green-200 px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold transition"
                        type="button"
                      >
                        <CheckCircle size={16} /> Approve
                      </button>

                      <button
                        onClick={() => handleAction(req.id, "Rejected", req)}
                        className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold transition"
                        type="button"
                      >
                        <XCircle size={16} /> Reject
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
  );
}
