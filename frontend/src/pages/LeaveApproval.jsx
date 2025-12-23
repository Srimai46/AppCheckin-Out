import { useState, useEffect } from "react";
import { getPendingLeaves, updateLeaveStatus } from "../api/leaveService";
import { CheckCircle, XCircle, Clock, User, Image as ImageIcon } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";
import { openAttachment } from "../utils/attachmentPreview";

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ ต้องชี้ไป backend (ห้ามปล่อยว่าง ไม่งั้นจะวิ่งไป 5173)
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

  const buildFileUrl = (pathOrUrl) => {
    if (!pathOrUrl) return "";

    // ถ้าเป็น url เต็มอยู่แล้ว
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

    // ✅ กันเคสไม่มี / นำหน้า (เช่น "uploads/leaves/..")
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
      const msg = err?.response?.data?.message || err?.message || "ไม่สามารถดึงข้อมูลได้";
      alertError("โหลดข้อมูลไม่สำเร็จ", msg);
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
    const actionText = isApprove ? "อนุมัติ" : "ปฏิเสธ";

    const employeeName = req?.employee
      ? `${req.employee.firstName} ${req.employee.lastName}`
      : "พนักงาน";
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
          <div style="color:#94a3b8; font-weight:800">ไฟล์แนบ</div>
          <div style="color:#0f172a; font-weight:900">มีไฟล์แนบ</div>
        </div>
      `
      : "";

    const confirmed = await alertConfirm(
      `ยืนยันการ${actionText}`,
      `
      <div style="text-align:left; line-height:1.65">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px">
          <div style="color:#64748b; font-weight:700">โปรดตรวจสอบรายละเอียดก่อนทำรายการ</div>
          ${badge}
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:14px">
          <div style="display:grid; grid-template-columns:110px 1fr; gap:8px 12px; font-size:14px">
            <div style="color:#94a3b8; font-weight:800">พนักงาน</div>
            <div style="color:#0f172a; font-weight:900">${employeeName}</div>

            <div style="color:#94a3b8; font-weight:800">ประเภท</div>
            <div style="color:#0f172a; font-weight:800">${typeName}</div>

            <div style="color:#94a3b8; font-weight:800">ช่วงวันที่</div>
            <div style="color:#0f172a; font-weight:800">${period}</div>

            <div style="color:#94a3b8; font-weight:800">จำนวน</div>
            <div style="color:#0f172a; font-weight:800">${req?.totalDaysRequested ?? "-"} วัน</div>

            <div style="color:#94a3b8; font-weight:800">เหตุผล</div>
            <div style="color:#334155; font-weight:700">${
              req?.reason ? req.reason : "<span style='color:#cbd5e1'>-</span>"
            }</div>
          </div>

          ${attachmentRow}
        </div>

        <div style="margin-top:10px; color:#64748b; font-size:12px">
          กด “ยืนยัน${actionText}” เพื่อบันทึกการทำรายการ
        </div>
      </div>
      `,
      `ยืนยัน${actionText}`
    );
    if (!confirmed) return;

    try {
      await updateLeaveStatus(id, status);
      await alertSuccess("บันทึกสำเร็จ", `ทำรายการ${actionText}เรียบร้อยแล้ว`);
      fetchRequests();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "เกิดข้อผิดพลาด";
      alertError("ทำรายการไม่สำเร็จ", msg);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        <Clock className="text-orange-500" /> รายการรออนุมัติ (Pending Approvals)
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">พนักงาน</th>
              <th className="p-4 font-semibold text-gray-600">ประเภท</th>
              <th className="p-4 font-semibold text-gray-600">วันที่ลา</th>
              <th className="p-4 font-semibold text-gray-600">จำนวน</th>
              <th className="p-4 font-semibold text-gray-600">เหตุผล</th>
              <th className="p-4 font-semibold text-gray-600 text-center">ไฟล์</th>
              <th className="p-4 font-semibold text-gray-600 text-center">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="p-6 text-center">
                  กำลังโหลด...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-400">
                  ไม่มีรายการรออนุมัติ
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

                  <td className="p-4 font-bold">{req.totalDaysRequested} วัน</td>

                  <td className="p-4 text-gray-500 text-sm max-w-xs truncate">
                    {req.reason || "-"}
                  </td>

                  {/* ✅ ไฟล์แนบ */}
                  <td className="p-4 text-center">
                    {req.attachmentUrl ? (
                      <button
                        type="button"
                        onClick={() => openAttachment(buildFileUrl(req.attachmentUrl))}
                        className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200
                                   px-4 py-2 rounded-xl flex items-center gap-2
                                   text-sm font-bold transition mx-auto"
                        title="ดูไฟล์แนบ"
                      >
                        <ImageIcon size={16} />
                        ดูไฟล์
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
                        <CheckCircle size={16} /> อนุมัติ
                      </button>

                      <button
                        onClick={() => handleAction(req.id, "Rejected", req)}
                        className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold transition"
                        type="button"
                      >
                        <XCircle size={16} /> ปฏิเสธ
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
