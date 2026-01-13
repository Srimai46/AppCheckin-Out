// frontend/src/pages/yearEnd/components/HistoryTable.jsx
import React from "react";
import { Lock, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function HistoryTable({ configs = [], onReopen }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
          {t("yearEndHistory.title")}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">{t("yearEndHistory.year")}</th>
              <th className="px-6 py-4">{t("yearEndHistory.lockStatus")}</th>
              <th className="px-6 py-4 text-center">{t("yearEndHistory.processedAt")}</th>
              <th className="px-6 py-4 text-right">{t("yearEndHistory.action")}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {configs.length > 0 ? (
              configs.map((config) => (
                <tr key={config.year} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-700">
                    {config.year}
                  </td>

                  <td className="px-6 py-4">
                    {config.isClosed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase">
                        <Lock size={12} /> {t("yearEndHistory.closed")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase">
                        <Unlock size={12} /> {t("yearEndHistory.open")}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center text-gray-500 text-xs font-medium">
                    {config.closedAt
                      ? new Date(config.closedAt).toLocaleString()
                      : "-"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {config.isClosed && (
                      <button
                        onClick={() => onReopen(config.year)}
                        className="text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-3xl transition-all text-[11px] font-black uppercase tracking-tighter border border-orange-100"
                      >
                        {t("yearEndHistory.unlock")}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-10 text-center text-gray-400 italic text-sm"
                >
                  {t("yearEndHistory.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
