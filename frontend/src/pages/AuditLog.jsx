import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";

export default function AuditLog() {
  const API_BASE = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  ).replace(/\/$/, "");

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/api/audit-log`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load audit logs");
        return res.json();
      })
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const formatLog = (log) => {
    const time = new Date(log.createdAt).toLocaleString("th-TH");

    const user =
      log.performedBy?.firstName
        ? `${log.performedBy.firstName} ${log.performedBy.lastName || ""}`
        : "SYSTEM";

    return `[${time}] ${log.action} ${log.modelName}#${log.recordId} by ${user}`;
  };

  return (
    <div className="p-6 h-screen max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <NotebookText className="text-orange-500" />
        <h1 className="text-2xl font-black text-slate-800">Audit Log</h1>
      </div>

      {/* Log Box */}
      <div className="h-[85vh] rounded-[2rem] border border-slate-200 bg-gray-50 overflow-y-auto p-6 font-mono text-sm space-y-1">
        {loading && (
          <div className="text-gray-400 italic">Loading logs...</div>
        )}

        {!loading && logs.length === 0 && (
          <div className="text-gray-400 italic">No audit logs</div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="text-slate-700">
            {formatLog(log)}
          </div>
        ))}
      </div>
    </div>
  );
}
