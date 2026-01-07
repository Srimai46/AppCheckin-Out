import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X ,ChevronLeft ,ChevronRight} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useYearEndProcessing } from "../hooks/useYearEndProcessing";
import {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
} from "../../../api/leaveService";

const PAGE_SIZE = 5;

/* =========================
   Helpers
========================= */
const getLeaveTypeLabel = (label, typeName, lang) => {
  if (label && typeof label === "object") {
    const key = lang?.split("-")[0];
    return label[key] || label.th || label.en || typeName;
  }
  return typeName || "-";
};

const renderPaid = (isPaid, t) => (isPaid ? t("common.yes") : t("common.no"));

const renderMaxConsecutive = (days, t) => {
  if (!days || days === 0) return t("common.unlimited");
  return `${days} ${t("common.days")}`;
};

export default function LeaveTypeCard() {
  const { t, i18n } = useTranslation();
  const { leaveTypes = [], fetchLeaveTypes } = useYearEndProcessing();

  /* =========================
     Form State
  ========================= */
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [typeName, setTypeName] = useState("");
  const [label, setLabel] = useState({ th: "", en: "" });
  const [isPaid, setIsPaid] = useState(true);
  const [maxCarryOver, setMaxCarryOver] = useState(0);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState(0);

  

  const resetForm = () => {
    setEditId(null);
    setTypeName("");
    setLabel({ th: "", en: "" });
    setIsPaid(true);
    setMaxCarryOver(0);
    setMaxConsecutiveDays(0);
  };

  const openAddForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (row) => {
    setEditId(row.id);
    setTypeName(row.typeName);
    setLabel(row.label || { th: "", en: "" });
    setIsPaid(row.isPaid);
    setMaxCarryOver(Number(row.maxCarryOver ?? 0));
    setMaxConsecutiveDays(row.maxConsecutiveDays ?? 0);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      typeName,
      label,
      isPaid,
      maxCarryOver: Number(maxCarryOver),
      maxConsecutiveDays: Number(maxConsecutiveDays),
    };

    try {
      editId
        ? await updateLeaveType(editId, payload)
        : await createLeaveType(payload);

      setFormOpen(false);
      resetForm();
      await fetchLeaveTypes();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.typeName}" ?`)) return;
    await deleteLeaveType(row.id);
    await fetchLeaveTypes();
  };

  /* =========================
     Pagination
  ========================= */
  const [page, setPage] = useState(1);
  

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(leaveTypes.length / PAGE_SIZE)),
    [leaveTypes]
  );

  const pagedLeaveTypes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return leaveTypes.slice(start, start + PAGE_SIZE);
  }, [leaveTypes, page]);

  /* =========================
     Render
  ========================= */
  return (
    <>
      {/* =========================
          FORM CARD 
      ========================= */}
      {formOpen && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
          {/* Form Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-widest text-slate-800">
                {editId
                  ? t("leaveType.form.editTitle")
                  : t("leaveType.form.addTitle")}
              </div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {t("leaveType.form.subtitle")}
              </div>
            </div>

            <button
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="h-10 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
            >
              {t("leaveType.form.close")}
            </button>
          </div>

          {/* Form Body */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Label TH */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {t("leaveType.form.labelTh")}
                </label>
                <input
                  placeholder="TH"
                  className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                       text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                  value={label.th}
                  onChange={(e) =>
                    setLabel({ ...label, th: e.target.value })
                  }
                />
              </div>
              

              

              {/* Label EN */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                   {t("leaveType.form.labelEh")}
                </label>
                <input
                    placeholder="EN"
                    className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                        text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    value={label.en}
                    onChange={(e) => {
                        const value = e.target.value;

                        // update label.en
                        setLabel((prev) => ({
                        ...prev,
                        en: value,
                        }));

                        // sync ไปที่ typeName ด้วย
                        setTypeName(value);
                    }}
                    />
              </div>

              {/* Max Carry Over */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {t("leaveType.form.maxCarryOver")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="h-11 px-5 rounded-2xl border border-gray-200 font-black text-[12px]"
                  value={maxCarryOver}
                  onChange={(e) => setMaxCarryOver(e.target.value)}
                />
              </div>

              {/* Max Consecutive */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {t("leaveType.form.maxConsecutive")}
                </label>
                <input
                  type="number"
                  className="h-11 px-5 rounded-2xl border border-gray-200 font-black text-[12px]"
                  value={maxConsecutiveDays}
                  onChange={(e) =>
                    setMaxConsecutiveDays(e.target.value)
                  }
                />
              </div>

              {/* Paid */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {t("leaveType.form.paid")}
                </label>
                <select
                  className="h-11 px-5 rounded-2xl border border-gray-200 font-black text-[12px]"
                  value={isPaid ? "1" : "0"}
                  onChange={(e) => setIsPaid(e.target.value === "1")}
                >
                  <option value="1">{t("common.yes")}</option>
                  <option value="0">{t("common.no")}</option>
                </select>
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="h-9 px-4 rounded-3xl border border-gray-200
                  text-gray-500 font-black text-[10px] uppercase tracking-widest"
              >
                {t("common.cancel")}
              </button>

              <button
                                type="button"
                                onClick={handleSubmit}
                                className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                              uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100
                                inline-flex items-center gap-2"
                              >
                                <Plus size={16} />
                                {editId
                                  ? t("leaveType.form.update")
                                  : t("leaveType.form.add")}
                              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          TABLE CARD
      ========================= */}
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-widest text-slate-800">
              {t("leaveType.table.title")}
            </div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {t("leaveType.table.subtitle")}
            </div>
          </div>

          <button
            onClick={openAddForm}
            className="h-10 px-4 rounded-3xl border border-gray-200 bg-white
              text-slate-800 font-black text-[11px] uppercase tracking-widest
              inline-flex items-center gap-2 hover:bg-gray-50 active:scale-95"
          >
            <Plus size={16} />
            {t("leaveType.action.add")}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">{t("leaveType.table.name")}</th>
                <th className="px-6 py-4">{t("leaveType.table.paid")}</th>
                <th className="px-6 py-4">
                  {t("leaveType.table.maxCarryOver")}
                </th>
                <th className="px-6 py-4">
                  {t("leaveType.table.maxConsecutive")}
                </th>
                <th className="px-6 py-4 text-right">
                  {t("leaveType.table.actions")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {pagedLeaveTypes.map((lt) => (
                <tr key={lt.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-black">
                    {getLeaveTypeLabel(
                      lt.label,
                      lt.typeName,
                      i18n.language
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {renderPaid(lt.isPaid, t)}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {Number(lt.maxCarryOver)} {t("common.days")}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {renderMaxConsecutive(
                      lt.maxConsecutiveDays,
                      t
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditForm(lt)}
                        className="h-9 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                              font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
                              inline-flex items-center gap-2"
                      >
                        <Pencil size={12} />
                        {t("leaveType.action.edit")}

                      </button>
                      <button
                        onClick={() => handleDelete(lt)}
                         className="h-9 px-4 rounded-3xl border border-rose-100 bg-rose-50 text-rose-700
                              font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95
                              inline-flex items-center gap-2"
                      >
                        <Trash2 size={12} />
                        {t("leaveType.action.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
{totalPages > 1 && (
  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
    {/* Info */}
    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
      Page {page} of {totalPages}
    </div>

    {/* Controls */}
    <div className="flex items-center gap-1">
      {/* Prev */}
      <button
        disabled={page === 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
          ${
            page === 1
              ? "border-gray-100 text-gray-300 cursor-not-allowed"
              : "border-gray-200 text-slate-700 hover:bg-gray-50"
          }`}
      >
         <ChevronLeft size={14} />
        Prev
      </button>

      {/* Page Numbers */}
      {Array.from({ length: totalPages }).map((_, i) => {
        const p = i + 1;
        const active = p === page;

        return (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`h-9 min-w-[38px] px-3 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95
              ${
                active
                     ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
              }`}
          >
            {p}
          </button>
        );
      })}

      {/* Next */}
      <button
        disabled={page === totalPages}
        onClick={() =>
          setPage((p) => Math.min(totalPages, p + 1))
        }
        className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
          ${
            page === totalPages
              ? "border-gray-100 text-gray-300 cursor-not-allowed"
              : "border-gray-200 text-slate-700 hover:bg-gray-50"
          }`}
      >
        Next
       <ChevronRight size={14} /> 
      </button>
      
    </div>
  </div>
)}

        </div>
      </div>
    </>
  );
}
