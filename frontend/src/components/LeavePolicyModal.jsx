import { useState } from "react";
import api from "../api/axios";
import { X, Minus, Plus, Save, Loader2 } from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

export default function LeavePolicyModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);

  // ✅ เหมือนภาพตัวอย่าง
  const [quotas, setQuotas] = useState({
    SICK: 30,
    PERSONAL: 6,
    ANNUAL: 6,
    EMERGENCY: 5,
  });

  if (!isOpen) return null;

  const clampInt = (v) => Math.max(0, Math.min(365, Math.floor(Number(v) || 0)));

  const handleUpdate = async () => {
    const confirmed = await alertConfirm(
      "Update Leave Policy (Company-wide)",
      "This change will take effect for all employees immediately.",
      "Confirm Policy Update"
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await api.put("/leaves/policy/quotas", { quotas });
      await alertSuccess("Policy Updated Successfully", "Leave quotas by category have been saved successfully.");
      onClose();
    } catch (err) {
      alertError("Update Failed", err?.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { key: "SICK", title: "SICK", total: quotas.SICK, used: 0 },
    { key: "PERSONAL", title: "PERSONAL", total: quotas.PERSONAL, used: 0 },
    { key: "ANNUAL", title: "ANNUAL", total: quotas.ANNUAL, used: 0 },
    { key: "EMERGENCY", title: "EMERGENCY", total: quotas.EMERGENCY, used: 0 },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
        {/* Top */}
        <div className="px-8 pt-8 pb-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={26} />
          </button>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Leave Policy</h2>
          <p className="mt-2 text-base font-bold text-slate-500">
            Update maximum leave days by category (Sick / Personal / Annual / Emergency) for all employees.
          </p>
        </div>

        {/* Cards */}
        <div className="px-10 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {cards.map((c) => (
              <div key={c.key} className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-6" >
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                  {c.title}
                </div>

                <div className="mt-5 flex items-end gap-3">
                  <div className="text-4xl font-black text-slate-900 leading-none">
                    {quotas[c.key]}
                  </div>
                  <div className="pb-1 text-[11px] font-black uppercase tracking-widest text-slate-300">
                    DAYS
                  </div>
                </div>

                {/* Stepper */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQuotas((p) => ({ ...p, [c.key]: clampInt(p[c.key] - 1) }))
                    }
                    disabled={loading}
                    className="h-12 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center
                      text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                    aria-label={`Decrease ${c.key}`}
                  >
                    <Minus size={18} />
                  </button>

                  <div className="flex-1 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={quotas[c.key]}
                      onChange={(e) =>
                        setQuotas((p) => ({ ...p, [c.key]: clampInt(e.target.value) }))
                      }
                      disabled={loading}
                      className="w-full h-full bg-transparent text-center font-black text-slate-900 outline-none
                        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                        disabled:opacity-70"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setQuotas((p) => ({ ...p, [c.key]: clampInt(p[c.key] + 1) }))
                    }
                    disabled={loading}
                    className="h-12 w-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center
                      text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                    aria-label={`Increase ${c.key}`}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="px-10 pb-8">
          <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 px-6 py-4">
            <div className="text-sm font-black uppercase tracking-widest text-rose-600">
              WARNING
            </div>
            <div className="mt-1 text-lg font-black text-rose-600">
              การเปลี่ยนแปลงนี้มีผลกับพนักงานทุกคนทันที
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-10 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-4 rounded-[2rem] border border-slate-200 bg-white
                font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={loading}
              className="py-4 rounded-[2rem] bg-blue-600 text-white
                font-black uppercase tracking-widest shadow-[0_18px_45px_rgba(37,99,235,0.25)]
                hover:bg-blue-700 transition-all active:scale-[0.99] disabled:opacity-60
                flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {loading ? "PROCESSING..." : "APPLY TO ALL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
