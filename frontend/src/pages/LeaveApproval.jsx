import { useState, useEffect } from "react";
import { getPendingLeaves, updateLeaveStatus } from "../api/leaveService";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูล
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getPendingLeaves();
      setRequests(data);
    } catch (err) {
      alert("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ฟังก์ชันกดปุ่ม
  const handleAction = async (id, status) => {
    if (!confirm(`ต้องการ ${status === 'Approved' ? 'อนุมัติ' : 'ปฏิเสธ'} คำขอนี้ใช่หรือไม่?`)) return;

    try {
      await updateLeaveStatus(id, status);
      alert("บันทึกสำเร็จ!");
      fetchRequests(); // รีโหลดข้อมูลใหม่
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
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
              <th className="p-4 font-semibold text-gray-600 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-6 text-center">กำลังโหลด...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">ไม่มีรายการรออนุมัติ</td></tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <User size={16} className="text-gray-400"/>
                      {req.employee.firstName} {req.employee.lastName}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                      {req.leaveType.typeName}
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    {new Date(req.startDate).toLocaleDateString('th-TH')} - {new Date(req.endDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className="p-4 font-bold">{req.totalDaysRequested} วัน</td>
                  <td className="p-4 text-gray-500 text-sm max-w-xs truncate">{req.reason || "-"}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button 
                      onClick={() => handleAction(req.id, 'Approved')}
                      className="bg-green-100 text-green-600 hover:bg-green-200 px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold transition"
                    >
                      <CheckCircle size={16} /> อนุมัติ
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'Rejected')}
                      className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold transition"
                    >
                      <XCircle size={16} /> ปฏิเสธ
                    </button>
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