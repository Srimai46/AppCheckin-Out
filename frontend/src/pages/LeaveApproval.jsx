import { useState, useEffect } from "react";
import { getPendingLeaves, updateLeaveStatus } from "../api/leaveService";
import { CheckCircle, XCircle, Clock, User, Image as ImageIcon, ExternalLink } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ ถ้า frontend/backend คนละโดเมน ให้ใส่ VITE_API_URL เช่น http://localhost:4000
  // และให้ attachmentUrl ใน DB เป็น "/uploads/leaves/xxx.jpg"
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const buildFileUrl = (pathOrUrl) => {
    if (!pathOrUrl) return "";
    // ถ้าเป็น url เต็มอยู่แล้ว
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    // ถ้าเป็น path แบบ /uploads/...
    return `${API_BASE}${pathOrUrl}`;
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

  // ✅ เปิดดูไฟล์/รูป
  const openAttachment = async (req) => {
    const url = buildFileUrl(req?.attachmentUrl);
    if (!url) return;

    // ใช้ SweetAlert แสดงรูป + ปุ่มเปิดแท็บใหม่
    await alertConfirm(
      "ไฟล์แนบ (Attachment)",
      `
      <div style="text-align:center">
        <div style="margin-bottom:10px; color:#64748b; font-weight:700">
          คลิกที่รูปเพื่อดูแบบเต็ม หรือเปิดแท็บใหม่
        </div>

        <a href="${url}" target="_blank" rel="noreferrer">
          <img
            src="${url}"
            alt="attachment"
            style="max-width:100%; max-height:65vh; border-radius:18px; border:1px solid #e2e8f0"
          />
        </a>

        <div style="margin-top:12px">
          <a href="${url}" target="_blank" rel="noreferrer"
             style="display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:999px;
                    background:#eff6ff; color:#2563eb; font-weight:900; text-decoration:none; border:1px solid #dbeafe">
            เปิดในแท็บใหม่
          </a>
        </div>
      </div>
      `,
      "ปิด"
    );
  };

  // ฟังก์ชันกดปุ่ม
  const handleAction = async (id, status, req) => {
    const isApprove = status === "Approved";
    const actionText = isApprove ? "อนุมัติ" : "ปฏิเสธ";

    // ทำข้อความให้ดูดีใน dialog
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

    const attachmentUrl = buildFileUrl(req?.attachmentUrl);
    const attachmentRow = req?.attachmentUrl
      ? `
        <div style="display:grid; grid-template-columns:110px 1fr; gap:8px 12px; margin-top:10px; font-size:14px">
          <div style="color:#94a3b8; font-weight:800">ไฟล์แนบ</div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
            <a href="${attachmentUrl}" target="_blank" rel="noreferrer"
               style="display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px;
                      background:#f1f5f9; color:#0f172a; font-weight:900; text-decoration:none; border:1px solid #e2e8f0">
              ดูไฟล์แนบ
            </a>
            <span style="color:#94a3b8; font-size:12px; font-weight:700">คลิกเพื่อเปิดแท็บใหม่</span>
          </div>
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
      fetchRequests(); // รีโหลดข้อมูลใหม่
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

              {/* ✅ เพิ่มคอลัมน์ไฟล์ */}
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
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAttachment(req)}
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold transition"
                          title="ดูไฟล์แนบ"
                        >
                          <ImageIcon size={16} /> ดูรูป
                        </button>

                        <a
                          href={buildFileUrl(req.attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold transition"
                          title="เปิดในแท็บใหม่"
                          onClick={(e) => e.stopPropagation?.()}
                        >
                          <ExternalLink size={16} /> เปิด
                        </a>
                      </div>
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
