import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";

export default function AuditLog() {
  const API_BASE = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  ).replace(/\/$/, "");

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

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

  const loadMoreLogs = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetchAuditLogs({ page, limit: 20 });
      if (res.success) {
        setLogs((prev) => [...prev, ...res.data]);
        setPage((prev) => prev + 1);
        if (res.data.length < 20) setHasMore(false); // หมดแล้ว
      }
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadMoreLogs();
    }
  };

  const formatLog = (log) => {
    const time = new Date(log.createdAt).toLocaleString("th-TH");

    const user = log.performedBy?.firstName
      ? `${log.performedBy.firstName} ${log.performedBy.lastName || ""}`
      : "SYSTEM";

    return `[${time}] ${log.action} ${log.modelName}#${log.recordId} by ${user}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <NotebookText className="text-orange-500" />
        <h1 className="text-2xl font-black text-slate-800">Audit Log</h1>
      </div>

      {/* Log Box */}
      <div
        className="h-[75vh] rounded-[2rem] border border-slate-200 bg-gray-50 overflow-y-auto p-6 font-mono text-sm space-y-1"
        onScroll={handleScroll}
      >

        
      

      </div>
    </div>
  );
}
