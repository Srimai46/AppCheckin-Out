import { useState, useEffect } from 'react';
import { checkIn, checkOut } from '../api/attendanceService';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (action) => {
    if(!confirm(`ยืนยันการ ${action === 'in' ? 'เข้างาน' : 'ออกงาน'}?`)) return;
    try {
      const res = action === 'in' ? await checkIn() : await checkOut();
      alert(res.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">สวัสดี, {user?.firstName} 👋</h1>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center mb-8">
        <h2 className="text-gray-500 mb-2">เวลาปัจจุบัน</h2>
        <div className="text-5xl font-mono font-bold text-gray-800 mb-2">
          {time.toLocaleTimeString('th-TH')}
        </div>
        <div className="text-gray-400">
          {time.toLocaleDateString('th-TH', { dateStyle: 'long' })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => handleAction('in')} className="bg-green-500 hover:bg-green-600 text-white p-6 rounded-xl text-xl font-bold transition">
          เข้างาน (Check In)
        </button>
        <button onClick={() => handleAction('out')} className="bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-xl text-xl font-bold transition">
          ออกงาน (Check Out)
        </button>
      </div>
    </div>
  );
}