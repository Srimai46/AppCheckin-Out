import { useState } from "react";
import api from "../api/axios";
import { X, Minus, Plus, Save, Loader2 } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

export default function LeavePolicyModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [quotas, setQuotas] = useState({
    SICK: 30,
    PERSONAL: 6,
    ANNUAL: 10,
    EMERGENCY: 5,
  });

  if (!isOpen) return null;

  const clampInt = (v) => Math.max(0, Math.min(365, Math.floor(Number(v) || 0)));

  const handleUpdate = async () => {
    const confirmed = await alertConfirm(
      "ปรับนโยบายการลา (ทั้งบริษัท)",
      "การเปลี่ยนแปลงนี้มีผลกับพนักงานทุกคนทันที",
      "ยืนยันปรับนโยบาย"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await api.put("/leaves/policy/quotas", { quotas });
      await alertSuccess("อัปเดตนโยบายสำเร็จ", "บันทึกโควต้ารายประเภทเรียบร้อยแล้ว");
      onClose();
    } catch (err) {
      alertError("อัปเดตไม่สำเร็จ", err?.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { key: "SICK", title: "SICK" },
    { key: "PERSONAL", title: "PERSONAL" },
    { key: "ANNUAL", title: "ANNUAL" },
    { key: "EMERGENCY", title: "EMERGENCY" },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-5xl p-10 relative shadow-2xl animate-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-gray-300 hover:text-rose-500 transition-colors"
          disabled={loading}
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-black mb-2 text-slate-800">Leave Policy</h2>
        <p className="text-sm font-bold text-slate-500 mb-8">ปรับวันลาสูงสุดแยกประเภทให้พนักงานทุกคน</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {cards.map((c) => (
            <div key={c.key} className="rounded-[2rem] border border-gray-100 bg-white shadow-sm p-6">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">{c.title}</div>
              <div className="mt-3 flex items-end gap-2">
                <div className="text-4xl font-black text-slate-900 leading-none">{quotas[c.key]}</div>
                <div className="text-xs font-black uppercase text-slate-300 pb-1">Days</div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuotas(p => ({ ...p, [c.key]: clampInt(p[c.key] - 1) }))}
                  className="h-10 w-10 rounded-2xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={quotas[c.key]}
                  onChange={(e) => setQuotas(p => ({ ...p, [c.key]: clampInt(e.target.value) }))}
                  className="flex-1 h-10 rounded-2xl bg-gray-50 text-center font-black outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setQuotas(p => ({ ...p, [c.key]: clampInt(p[c.key] + 1) }))}
                  className="h-10 w-10 rounded-2xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-5 rounded-3xl font-black text-[11px] uppercase border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 py-5 rounded-3xl font-black text-sm bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            {loading ? "PROCESSING..." : "APPLY TO ALL"}
          </button>
        </div>
      </div>
    </div>
  );
}