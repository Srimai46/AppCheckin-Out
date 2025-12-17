import { useState, useEffect } from "react";
import axios from "axios";
import { Bell, CheckCheck, Clock } from "lucide-react";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // 1. ฟังก์ชันดึงข้อมูลแจ้งเตือน
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8080/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // ดึงข้อมูลใหม่ทุกๆ 1 นาที (Polling)
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. ฟังก์ชันกดอ่านแจ้งเตือนรายอัน
  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`http://localhost:8080/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  // 3. ฟังก์ชันอ่านทั้งหมด
  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`http://localhost:8080/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="relative">
      {/* ไอคอนกระดิ่ง */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-500 hover:text-blue-600 transition-all active:scale-95"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* กล่อง Dropdown แจ้งเตือน */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-80 rounded-[2rem] border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">การแจ้งเตือน</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1">
                  <CheckCheck size={12}/> อ่านทั้งหมด
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center text-gray-300 font-bold text-sm italic">ไม่มีการแจ้งเตือนใหม่</div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id);
                    }}
                    className={`p-5 border-b border-gray-50 cursor-pointer transition-all ${!n.isRead ? 'bg-blue-50/40 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}`}
                  >
                    <p className={`text-[11px] leading-relaxed ${!n.isRead ? 'text-slate-800 font-black' : 'text-gray-500 font-medium'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-gray-400">
                      <Clock size={10} />
                      <span className="text-[9px] font-bold uppercase">
                        {new Date(n.createdAt).toLocaleString('th-TH')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}