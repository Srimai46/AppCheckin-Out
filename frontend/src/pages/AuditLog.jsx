import { useEffect, useState } from "react";
import { NotebookText, Loader2, AlertCircle } from "lucide-react";
import { io } from "socket.io-client";

export default function AuditLog() {
  // Config URL: ตัด /api ออก ถ้ามี เพื่อให้ Socket ต่อไปที่ Root (http://localhost:8080)
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
    // เรียกไปที่ Path ที่เราแก้ไว้เพื่อเลี่ยง AdBlock (/api/activity-view/history)
    fetch(`${API_BASE}/api/activity-view/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) throw new Error("Token หมดอายุ");
          if (res.status === 404) throw new Error("ไม่พบ Path API (404)");
          throw new Error("ดึงข้อมูลไม่สำเร็จ");
        }
        return res.json();
      })
      .then((response) => {
        // Backend ส่ง { success: true, data: [...] }
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
    // Socket ต้องต่อไปที่ Base URL (เช่น http://localhost:8080) ไม่ใช่ /api
    const socket = io(API_BASE, {
        transports: ['websocket', 'polling'], // บังคับใช้ websocket เพื่อความชัวร์
        withCredentials: true
    });

    socket.on("connect", () => {
      console.log("✅ Socket Connected: พร้อมรับข้อมูล Real-time");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket Connection Error:", err);
    });

    // ฟัง Event 'new-audit-log' จาก Backend
    socket.on("new-audit-log", (newLog) => {
      console.log("🔔 มีรายการใหม่เข้ามา:", newLog);
      
      // เอาข้อมูลใหม่ แทรกไปไว้บนสุดทันที
      setLogs((prevLogs) => [newLog, ...prevLogs]);
    });

    // Cleanup เมื่อเปลี่ยนหน้า
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
        {loading && <Loader2 className="animate-spin text-slate-400" size={20} />}
      </div>

      {/* Log Box */}
      <div className="flex-1 rounded-[2rem] border border-slate-200 bg-gray-50 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-y-auto p-6 font-mono text-sm space-y-2">
          {error && <div className="text-rose-500 text-center p-4">{error}</div>}

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
                // Animation: ให้รายการใหม่ Slide เข้ามาสวยๆ
                className="group hover:bg-white p-2 rounded-lg transition-all border-b border-gray-100 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-500"
              >
                <span className="text-slate-400 shrink-0 text-xs mt-1">[{time}]</span>
                <span className={`font-bold w-16 shrink-0 text-xs mt-1 ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-bold">{log.modelName}#{log.recordId}</span>
                        <span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 rounded-full">@{user}</span>
                    </div>
                    <p className="text-slate-500 italic truncate text-xs mt-1">- {log.details}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}