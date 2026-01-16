// frontend/src/pages/employees/employeeList/components/ExportAllChooser.jsx
import { useTranslation } from "react-i18next";
import { X, Download, FileSpreadsheet } from "lucide-react";

export default function ExportAllChooser({ open, onClose, onPick }) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-[1.5rem] bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="text-lg font-black text-slate-800">
              {t("employeeList.exportAll.title")}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition"
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-3">
            <button
              type="button"
              onClick={() => onPick("workbook")}
              className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition"
            >
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5" />
                <div>
                  <div className="font-black text-slate-800">
                    {t("employeeList.exportAll.workbook.title")}
                  </div>
                  <div className="text-sm text-slate-600 font-bold">
                    {t("employeeList.exportAll.workbook.desc")}
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPick("employeesList")}
              className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition"
            >
              <div className="flex items-start gap-3">
                <Download className="mt-0.5" />
                <div>
                  <div className="font-black text-slate-800">
                    {t("employeeList.exportAll.employeesList.title")}
                  </div>
                  <div className="text-sm text-slate-600 font-bold">
                    {t("employeeList.exportAll.employeesList.desc")}
                  </div>
                </div>
              </div>
            </button>

            <div className="text-xs text-slate-500 font-bold pt-2">
              {t("employeeList.exportAll.note")}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
