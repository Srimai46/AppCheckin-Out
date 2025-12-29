import React from "react";
import { RefreshCw, Save } from "lucide-react";
import { useCarryOverLimits } from "../hooks/useCarryOverLimits";

export default function CarryOverCard() {
  const { carryOverLimits, handleCarryOverChange, carrySaving, saveCarryOverLimits } = useCarryOverLimits();

  return (
    <div className="rounded-3xl border border-gray-100 bg-gray-50/50 p-5 mb-6">
      <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
        <div>
          <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
            Custom Holidays Carry Over
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Maximum carry over days to next year (per employee) — separated by type
          </div>
        </div>

        <button
          type="button"
          onClick={saveCarryOverLimits}
          disabled={carrySaving}
          className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
            uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
            shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
        >
          {carrySaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {carrySaving ? "Saving..." : "Save Carry Over"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        {Object.keys(carryOverLimits).map((type) => (
          <div key={type}>
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">{type}</label>
            <input
              type="number"
              min={0}
              max={365}
              value={carryOverLimits[type]}
              onChange={(e) => handleCarryOverChange(type, e.target.value)}
              className="w-full border border-gray-200 rounded-3xl px-3 py-2 text-sm font-bold
                focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
