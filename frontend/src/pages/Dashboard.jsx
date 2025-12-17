import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkIn, checkOut, getMyHistory } from '../api/attendanceService';
// ✅ นำเข้า getMyQuotas มาใช้งาน
import { getMyQuotas } from '../api/leaveService'; 
import { LogIn, LogOut, Calendar, Loader2, StickyNote, PieChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); 
  
  const [time, setTime] = useState(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState([]); 
  // ✅ เพิ่ม State สำหรับเก็บข้อมูลโควตา
  const [leaveQuotas, setLeaveQuotas] = useState([]); 
  const [dataLoading, setDataLoading] = useState(false); 

  const fetchData = async () => {
    try {
      setDataLoading(true);
      // ✅ ดึงข้อมูลพร้อมกันทั้งประวัติและโควตา
      const [historyRes, quotaRes] = await Promise.all([
        getMyHistory(),
        getMyQuotas()
      ]);
      
      // จัดการข้อมูลประวัติ
      if (historyRes.data && Array.isArray(historyRes.data)) {
        setAttendanceHistory(historyRes.data);
      } else if (Array.isArray(historyRes)) {
        setAttendanceHistory(historyRes);
      }

      // ✅ จัดการข้อมูลโควตา
      setLeaveQuotas(quotaRes || []);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData(); // ✅ เรียกฟังก์ชันดึงข้อมูลรวม
    
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user, authLoading]);

  const handleAction = async (action) => {
    const isCheckIn = action === 'in';
    if(!confirm(`ยืนยันการ ${isCheckIn ? 'เข้างาน' : 'ออกงาน'}?`)) return;
    
    try {
      const res = isCheckIn ? await checkIn() : await checkOut();
      if(res.result) {
         alert(`✅ บันทึกสำเร็จ!`);
      } else {
         alert(res.message || 'บันทึกสำเร็จ');
      }
      fetchData(); // ✅ รีโหลดข้อมูลใหม่ทั้งหมด
    } catch (err) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full justify-center items-center bg-gray-50">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  }

  if (!user) {
    setTimeout(() => navigate('/login'), 0);
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      
      {/* Header Section */}
      <div className="text-center mt-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">ระบบลงเวลาเข้างาน</h1>
        <p className="text-gray-600">สวัสดี, คุณ {user.firstName} {user.lastName}</p>
        <p className="text-lg text-blue-600 font-medium mt-2">
          {time.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, 
          {' '}{time.toLocaleTimeString('th-TH')}
        </p>
      </div>

      {/* ✅ Leave Quota Section - ส่วนที่เพิ่มใหม่ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaveQuotas.length > 0 ? (
          leaveQuotas.map((q, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{q.type}</span>
                <PieChart size={20} className="text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{q.remaining} <span className="text-xs font-normal text-gray-500">วัน</span></div>
                <div className="text-[10px] text-gray-400 mt-1">ใช้ไปแล้ว {q.used} จาก {q.total} วัน</div>
              </div>
              <div className="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${(q.used / q.total) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-4 bg-blue-50 text-blue-600 rounded-xl text-center text-sm">
             ยังไม่มีข้อมูลโควตาวันลาในปีนี้
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <button onClick={() => handleAction('in')} className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white py-5 px-6 rounded-xl text-xl font-bold shadow-md transition-transform hover:-translate-y-1">
          <LogIn size={28} /> ลงเวลาเข้า (Check In)
        </button>
        <button onClick={() => handleAction('out')} className="flex items-center justify-center gap-3 bg-rose-400 hover:bg-rose-500 text-white py-5 px-6 rounded-xl text-xl font-bold shadow-md transition-transform hover:-translate-y-1">
          <LogOut size={28} /> ลงเวลาออก (Check Out)
        </button>
        <button onClick={() => navigate('/leave-request')} className="flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-500 text-white py-5 px-6 rounded-xl text-xl font-bold shadow-md transition-transform hover:-translate-y-1">
          <Calendar size={28} /> ลางาน (Leave)
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
           <h2 className="font-semibold text-gray-700 text-lg">📅 ประวัติการเข้างานของคุณ</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">วันที่</th>
                <th className="px-6 py-4 font-semibold">เวลาเข้า</th>
                <th className="px-6 py-4 font-semibold">เวลาออก</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 font-semibold">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {dataLoading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center"><Loader2 className="animate-spin inline mr-2" /> กำลังโหลด...</td></tr>
              ) : attendanceHistory.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
              ) : (
                attendanceHistory.map((row, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{row.dateDisplay}</td>
                    <td className="px-6 py-4 text-green-700 font-medium">{row.checkInTimeDisplay}</td>
                    <td className="px-6 py-4 text-red-600 font-medium">{row.checkOutTimeDisplay}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.statusDisplay === 'สาย' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {row.statusDisplay || 'ปกติ'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{row.note || '-'}</td>
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