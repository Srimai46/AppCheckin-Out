// frontend/src/pages/employees/employeeList/components/PaginationBar.jsx
import { useTranslation } from "react-i18next";

export default function PaginationBar({ page, totalPages, onPrev, onNext }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {t("employeeList.pagination.label", { page, totalPages })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            page <= 1
              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
              : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {t("common.prev")}
        </button>

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            page >= totalPages
              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
              : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}
