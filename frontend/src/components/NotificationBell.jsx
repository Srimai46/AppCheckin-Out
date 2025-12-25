import { useState, useEffect } from "react";
import axios from "axios";
import { Bell, CheckCheck, Clock } from "lucide-react";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const SERVER_HOSTNAME = window.location.hostname;
const API_URL = `http://${SERVER_HOSTNAME}:8080/api/notifications`;
const SOCKET_URL = `http://${SERVER_HOSTNAME}:8080`;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState(null);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(API_URL, getAuthHeader());
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // 1. สร้างการเชื่อมต่อ Socket ชี้ไปที่ IP Server
    const newSocket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
      // ✅ เปลี่ยนจาก transports: ["websocket"]
      // เป็นการยอมให้ใช้ polling ก่อน (default behavior)
      transports: ["polling", "websocket"],
      upgrade: true, // อนุญาตให้ขยับจาก polling เป็น websocket เมื่อพร้อม
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // 2. ดึง User ID จาก Token เพื่อ Join Room
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded = jwtDecode(token);
        // ✅ ตรวจสอบสถานะการเชื่อมต่อก่อน emit
        newSocket.on("connect", () => {
          console.log("✅ Socket Connected!");
          // newSocket.emit("join", decoded.id);
        });
      }
    } catch (error) {
      console.error("Token decode error:", error);
    }

    // 3. รอรับการแจ้งเตือนใหม่
    newSocket.on("new_notification", (data) => {
      console.log("📩 Received notification:", data);
      setNotifications((prev) => [data, ...prev]);
      if (data.unreadCount !== undefined) {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await axios.patch(
        `${API_URL}/${id}/read`,
        {},
        getAuthHeader()
      );

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      // อัปเดตตัวเลขจากยอดที่ Backend คำนวณมาให้ใหม่
      setUnreadCount(res.data.unreadCount ?? Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.patch(`${API_URL}/read-all`, {}, getAuthHeader());
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-blue-600 transition-all active:scale-95"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-3 w-80 rounded-[1.5rem] border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Read everything
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="p-10 text-center text-gray-300 font-bold text-sm italic">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id);
                    }}
                    className={`p-4 border-b border-gray-50 cursor-pointer transition-all ${
                      !n.isRead
                        ? "bg-blue-50/40 border-l-4 border-l-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <p
                      className={`text-[12px] leading-relaxed ${
                        !n.isRead ? "text-slate-800 font-bold" : "text-gray-500"
                      }`}
                    >
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-gray-400">
                      <Clock size={10} />
                      <span className="text-[10px] font-bold">
                        {new Date(n.createdAt).toLocaleString("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
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
