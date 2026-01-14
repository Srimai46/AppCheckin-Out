import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Bell, CheckCheck, Clock } from "lucide-react";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SERVER_HOSTNAME = window.location.hostname;
const API_URL = `http://${SERVER_HOSTNAME}:8080/api/notifications`;
const SOCKET_URL = `http://${SERVER_HOSTNAME}:8080`;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const { i18n } = useTranslation();
  const navigate = useNavigate();

  // ✅ กัน fetch ถี่เกิน (เวลา backend ยิง refresh รัวๆ)
  const refreshTimerRef = useRef(null);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      headers: { Authorization: `Bearer ${token}` },
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(API_URL, getAuthHeader());
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount ?? 0);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, [getAuthHeader]);

  // ✅ helper: debounce refresh (150ms)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchNotifications();
    }, 150);
  }, [fetchNotifications]);

  useEffect(() => {
    // โหลดครั้งแรก
    fetchNotifications();

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 800,
    });

    socket.on("connect", () => {
      console.log("✅ Notification Socket Connected!", socket.id);
    });

    // ✅ 핵심: backend ยิง event นี้ -> frontend fetch ใหม่
    socket.on("notification_refresh", () => {
      console.log("🔔 notification_refresh -> scheduling fetch...");
      scheduleRefresh();
    });

    // (optional) ถ้าคุณมีระบบส่ง payload noti มาเลยก็รองรับไว้
    socket.on("new_notification", (data) => {
      console.log("📩 Received new_notification:", data);

      // backend บางทีไม่ได้ส่ง id/createdAt -> fetch ใหม่ชัวร์สุด
      if (!data?.id || !data?.createdAt) {
        scheduleRefresh();
        return;
      }

      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) =>
        data.unreadCount !== undefined ? data.unreadCount : prev + 1
      );
    });

    socket.on("disconnect", (reason) => {
      console.log("🔥 Notification Socket Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect_error:", err?.message || err);
    });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      socket.disconnect();
    };
  }, [fetchNotifications, scheduleRefresh]);

  // ✅ เปิด dropdown แล้ว fetch ซ้ำกันพลาด (UX ดีขึ้น)
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id) => {
      try {
        const res = await axios.patch(`${API_URL}/${id}/read`, {}, getAuthHeader());

        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );

        setUnreadCount((prev) => res.data?.unreadCount ?? Math.max(0, prev - 1));
      } catch (err) {
        console.error("Mark as read error:", err);
      }
    },
    [getAuthHeader]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await axios.patch(`${API_URL}/read-all`, {}, getAuthHeader());
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  }, [getAuthHeader]);

  const handleClickNotification = useCallback(
    async (n) => {
      try {
        if (!n?.isRead && n?.id) {
          await handleMarkAsRead(n.id);
        }
      } finally {
        setIsOpen(false);

        // ✅ ไปหน้า employee detail ได้เมื่อมี relatedEmployeeId
        if (n?.relatedEmployeeId) {
          navigate(`/employees/${n.relatedEmployeeId}`);
        }
      }
    },
    [handleMarkAsRead, navigate]
  );

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button
          onClick={() => setIsOpen((v) => !v)}
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
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <div className="absolute right-0 top-full mt-3 w-80 rounded-[1.5rem] border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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
                  notifications.map((n) => {
                    const canGoEmployee = !!n?.relatedEmployeeId;

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClickNotification(n)}
                        className={`p-4 border-b border-gray-50 transition-all cursor-pointer ${
                          !n.isRead
                            ? "bg-blue-50/40 border-l-4 border-l-blue-500"
                            : "hover:bg-gray-50"
                        }`}
                        title={canGoEmployee ? "Open employee details" : "Mark as read"}
                      >
                        <p
                          className={`text-[12px] leading-relaxed ${
                            !n.isRead
                              ? "text-slate-800 font-bold"
                              : "text-slate-600 font-medium"
                          }`}
                        >
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock size={10} />
                            <span className="text-[10px] font-bold">
                              {n.createdAt
                                ? new Date(n.createdAt).toLocaleString(
                                    i18n.language === "en" ? "en-GB" : "th-TH",
                                    { dateStyle: "short", timeStyle: "short" }
                                  )
                                : "-"}
                            </span>
                          </div>

                          {canGoEmployee && (
                            <span className="text-[10px] font-black text-blue-600">
                              View
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
