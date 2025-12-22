import { useState, useEffect } from "react";
import { getPendingLeaves, updateLeaveStatus } from "../api/leaveService";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

function PaginationBar({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        Page {page} / {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
            ${
              page <= 1
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
            }`}
        >
          Prev
        </button>

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
            ${
              page >= totalPages
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
            }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // ดึงข้อมูล
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getPendingLeaves();
      setRequests(Array.isArray(data) ? data : []);
      setPage(1); // ✅ รีเซ็ตหน้าเมื่อโหลดใหม่
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "ไม่สามารถดึงข้อมูลได้";
      alertError("โหลดข้อมูลไม่สำเร็จ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ✅ clamp เมื่อจำนวน request ลดลงหลังอนุมัติ/ปฏิเสธ
  useEffect(() => {
    const total = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
    setPage((p) => clamp(p, 1, total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests.length]);

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pageItems = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
            <div style="color:#0f172a; font-weight:800">${
              req?.totalDaysRequested ?? "-"
            } วัน</div>

            <div style="color:#94a3b8; font-weight:800">เหตุผล</div>
            <div style="color:#334155; font-weight:700">${
              req?.reason
                ? req.reason
                : "<span style='color:#cbd5e1'>-</span>"
            }</div>
          </div>
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Clock className="text-amber-600" />
            </div>

            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-slate-800">
                Pending Approvals
              </h1>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Total {requests.length} • Page size {PAGE_SIZE}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
              <tr>
                <th className="px-6 py-4">พนักงาน</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">วันที่ลา</th>
                <th className="px-6 py-4">จำนวน</th>
                <th className="px-6 py-4">เหตุผล</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>

            <tbody className="text-[11px] font-bold">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                    ไม่มีรายการรออนุมัติ
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                    ไม่มีข้อมูลในหน้านี้
                  </td>
                </tr>
              ) : (
                pageItems.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-black text-slate-800">
                        <User size={16} className="text-gray-400" />
                        {req.employee?.firstName} {req.employee?.lastName}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                        {req.employee?.role || "Employee"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                        {req.leaveType?.typeName || "-"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {req.startDate ? new Date(req.startDate).toLocaleDateString("th-TH") : "-"}{" "}
                      -{" "}
                      {req.endDate ? new Date(req.endDate).toLocaleDateString("th-TH") : "-"}
                    </td>

                    <td className="px-6 py-4 font-black text-slate-800 whitespace-nowrap">
                      {req.totalDaysRequested ?? "-"} วัน
                    </td>

                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                      {req.reason || "-"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleAction(req.id, "Approved", req)}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 text-[11px] font-black uppercase tracking-widest border border-emerald-100 transition-all active:scale-95"
                        >
                          <CheckCircle size={16} /> Approve
                        </button>

                        <button
                          onClick={() => handleAction(req.id, "Rejected", req)}
                          className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl flex items-center gap-2 text-[11px] font-black uppercase tracking-widest border border-rose-100 transition-all active:scale-95"
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

          {!loading && requests.length > 0 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
