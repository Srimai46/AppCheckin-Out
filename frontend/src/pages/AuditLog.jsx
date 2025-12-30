import { useEffect, useState } from "react";
import { NotebookText, Loader2, AlertCircle } from "lucide-react";
// ✅ 1. Import Socket Client
import { io } from "socket.io-client";

export default function AuditLog() {
  const API_BASE = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  ).replace(/\/$/, "");

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ----------------------------------------------------
    // ส่วนที่ A: ดึงข้อมูลย้อนหลัง (History)
    // ----------------------------------------------------
    fetch(`${API_BASE}/api/activity-view/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403)
            throw new Error("สิทธิ์ไม่เพียงพอ หรือ Token หมดอายุ");
          if (res.status === 404)
            throw new Error("ไม่พบข้อมูล (404) - ตรวจสอบ Backend Path");
          throw new Error("ไม่สามารถดึงข้อมูลได้");
        }
        return res.json();
      })
      .then((response) => {
        setLogs(response.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });

    // ----------------------------------------------------
    // ส่วนที่ B: ✅ เชื่อมต่อ Socket.io (Real-time)
    // ----------------------------------------------------
    const socket = io(API_BASE);

    socket.on("connect", () => {
      console.log("✅ Socket Connected: Audit Log");
    });

    // รอรับ Event 'new-audit-log' จาก Backend
    socket.on("new-audit-log", (newLog) => {
      console.log("🔔 New Activity:", newLog);
      
      // แทรกข้อมูลใหม่ไปไว้ตัวแรกสุดของ Array ทันที
      setLogs((prevLogs) => [newLog, ...prevLogs]);
    });

    // Cleanup: ตัดการเชื่อมต่อเมื่อปิดหน้า
    return () => {
      socket.disconnect();
    };

  }, [API_BASE]);

  const getActionColor = (action) => {
    const colors = {
      CREATE: "text-emerald-600",
      UPDATE: "text-amber-600",
      DELETE: "text-rose-600",
      LOGIN: "text-blue-600",
    };
    return colors[action] || "text-slate-600";
  };

  return (
    <div className="p-6 h-screen max-w-7xl mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <NotebookText className="text-orange-500" />
          <h1 className="text-2xl font-black text-slate-800">
            System Activities (Real-time)
          </h1>
        </div>
        {loading && (
          <Loader2 className="animate-spin text-slate-400" size={20} />
        )}
      </div>

      {/* Log Box */}
      <div className="flex-1 rounded-[2rem] border border-slate-200 bg-gray-50 overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-6 font-mono text-sm space-y-2">
          {error && (
            <div className="flex items-center gap-2 text-rose-500 p-4 bg-rose-50 rounded-xl border border-rose-100 font-sans">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && logs.length === 0 && !error && (
            <div className="text-gray-400 italic text-center py-10">
              No audit logs found.
            </div>
          )}

          {logs.map((log) => {
            const time = new Date(log.createdAt).toLocaleString("th-TH");
            const user = log.performedBy
              ? `${log.performedBy.firstName} ${log.performedBy.lastName || ""}`
              : "SYSTEM";

            return (
              <div
                key={log.id}
                // เพิ่ม animation เล็กน้อยให้รู้ว่าอันไหนมาใหม่
                className="group hover:bg-white p-1 rounded-md transition-all border-b border-gray-100 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <span className="text-slate-400 shrink-0">[{time}]</span>
                <span
                  className={`font-bold w-16 shrink-0 ${getActionColor(
                    log.action
                  )}`}
                >
                  {log.action}
                </span>
                <span className="text-slate-700 font-bold shrink-0">
                  {log.modelName}#{log.recordId}
                </span>
                <span className="text-slate-500 flex-1 truncate italic">
                  - {log.details}
                </span>
                <span className="text-blue-600 font-bold shrink-0">
                  @{user}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}