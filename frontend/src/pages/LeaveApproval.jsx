import { useState, useEffect } from "react";
import { getPendingLeaves, updateLeaveStatus, grantSpecialLeave } from "../api/leaveService";
import { CheckCircle, XCircle, Clock, Star, CheckSquare, Square, Trash2 } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. ดึงข้อมูลรายการรออนุมัติ
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getPendingLeaves();
      setRequests(Array.isArray(data) ? data : []);
      setSelectedIds([]); // Reset selection on refresh
    } catch (err) {
      alertError("Failed to Load Data", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // 2. ระบบ Selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === requests.length && requests.length > 0 ? [] : requests.map(r => r.id));
  };

  // 3. ✅ ฟังก์ชันประมวลผล (Bulk & Single)
  const handleAction = async (mode, singleReq = null) => {
    const targets = singleReq ? [singleReq] : requests.filter(r => selectedIds.includes(r.id));
    
    if (targets.length === 0) return alertError("Selection Empty", "Please select requests first.");

    const actionText = mode === "Special" ? "Special Approval (Non-deductible)" : (mode === "Approved" ? "Normal Approve" : "Reject");
    
    const confirmed = await alertConfirm(
      `Confirm ${actionText}`,
      `Are you sure you want to process <b>${targets.length}</b> request(s) as <b>${actionText}</b>?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      
      // ประมวลผลวนลูปตามรายการที่เลือก
      for (const req of targets) {
        if (mode === "Special") {
          // ✅ เรียกใช้ API ตัวใหม่ที่ไปลงหมวด Special
          await grantSpecialLeave({
            employeeId: req.employeeId,
            amount: req.totalDaysRequested,
            reason: `Special Case Approval for: ${req.reason || 'No reason'}`,
            year: new Date(req.startDate).getFullYear(),
            leaveRequestId: req.id // เพื่อปิดสถานะใบลา
          });
        } else {
          // อนุมัติ/ปฏิเสธแบบปกติ (หักโควตาเดิม)
          await updateLeaveStatus(req.id, mode);
        }
      }

      await alertSuccess("Success", `Successfully processed ${targets.length} request(s).`);
      fetchRequests();
    } catch (err) {
      alertError("Action Failed", err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800">
          <Clock className="text-orange-500" /> Pending Approvals
        </h1>

        {/* ✅ แถบเครื่องมือจัดการแบบกลุ่ม (แสดงเมื่อมีการติ๊กเลือก) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
              {selectedIds.length} Selected
            </span>
            <button onClick={() => handleAction("Approved")} className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95">
              Bulk Approve
            </button>
            <button onClick={() => handleAction("Special")} className="bg-purple-600 text-white px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 active:scale-95 flex items-center gap-1">
              <Star size={12} className="fill-white" /> Bulk Special
            </button>
            <button onClick={() => handleAction("Rejected")} className="bg-slate-200 text-slate-500 p-2 rounded-2xl hover:bg-rose-100 hover:text-rose-600 transition-all">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="p-5 w-12 text-center">
                <button onClick={toggleSelectAll} className="text-slate-300 hover:text-blue-500 transition-all">
                  {selectedIds.length === requests.length && requests.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                </button>
              </th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Employee</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Type</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Date Range</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Days</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Manage</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="6" className="p-20 text-center font-black italic text-blue-500 tracking-tighter animate-pulse">SYNCHRONIZING DATA...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan="6" className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-sm">No Pending Tasks</td></tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className={`transition-all duration-300 ${selectedIds.includes(req.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50"}`}>
                  <td className="p-5 text-center">
                    <button onClick={() => toggleSelect(req.id)} className={`transition-all ${selectedIds.includes(req.id) ? "text-blue-600 scale-110" : "text-slate-200 hover:text-slate-400"}`}>
                      {selectedIds.includes(req.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </td>

                  <td className="p-5">
                    <div className="font-black text-slate-700 leading-none tracking-tight">{req.employee?.firstName} {req.employee?.lastName}</div>
                    <div className="text-[9px] font-black text-slate-300 uppercase mt-1">Ref: #{req.id}</div>
                  </td>

                  <td className="p-5">
                    <span className="bg-white border border-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                      {req.leaveType?.typeName}
                    </span>
                  </td>

                  <td className="p-5 text-[11px] font-bold text-slate-400 italic">
                    {new Date(req.startDate).toLocaleDateString('th-TH')} - {new Date(req.endDate).toLocaleDateString('th-TH')}
                  </td>

                  <td className="p-5 text-center font-black text-slate-800 text-lg">{req.totalDaysRequested}</td>

                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleAction("Approved", req)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Approve"><CheckCircle size={18} /></button>
                      <button onClick={() => handleAction("Special", req)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Special Approval"><Star size={18} className="fill-purple-100" /></button>
                      <button onClick={() => handleAction("Rejected", req)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Reject"><XCircle size={18} /></button>
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