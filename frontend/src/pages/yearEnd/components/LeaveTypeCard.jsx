import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X ,ChevronLeft ,ChevronRight} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useYearEndProcessing } from "../hooks/useYearEndProcessing";
import { alertConfirm, alertSuccess, alertError } from "../../../utils/sweetAlert";
import {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
} from "../../../api/leaveService";

const PAGE_SIZE = 5;

/* ========================= Helpers ========================= */
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

  /* ========================= Form State ========================= */
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
    // ===== Validate required fields =====
    if (!label.th?.trim() || !label.en?.trim()) {
      return alertError(
        t("common.missingInfo"),
        t("leaveType.form.requiredLabel")
      );
    }

    if (Number(maxCarryOver) < 0 || Number(maxConsecutiveDays) < 0) {
      return alertError(
        t("common.invalidValue"),
        t("leaveType.form.invalidNumber")
      );
    }

    const payload = {
      typeName,
      label,
      isPaid,
      maxCarryOver: Number(maxCarryOver),
      maxConsecutiveDays: Number(maxConsecutiveDays),
    };

    // ===== Confirm before save =====
    const confirmed = await alertConfirm(
      editId ? t("leaveType.confirm.updateTitle") : t("leaveType.confirm.addTitle"),
      editId
        ? t("leaveType.confirm.updateMessage")
        : t("leaveType.confirm.addMessage"),
      t("common.save")
    );
    if (!confirmed) return;

    try {
      editId
        ? await updateLeaveType(editId, payload)
        : await createLeaveType(payload);

      setFormOpen(false);
      resetForm();
      await fetchLeaveTypes();
      window.dispatchEvent(new Event("leave-type-refresh"));

      // ===== Success alert =====
      await alertSuccess(
        t("common.success"),
        editId
          ? t("leaveType.success.updated")
          : t("leaveType.success.created")
      );
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t("common.systemError");

      // ===== Error alert =====
      alertError(t("common.saveFailed"), msg);
    }
  };

  const handleDelete = async (row) => {
    const confirmed = await alertConfirm(
      t("leaveType.confirm.deleteTitle"),
      t("leaveType.confirm.deleteMessage", { name: row.typeName }),
      t("common.delete")
    );
    if (!confirmed) return;

    try {
      await deleteLeaveType(row.id);
      await fetchLeaveTypes();
      window.dispatchEvent(new Event("leave-type-refresh"));

      await alertSuccess(
        t("common.success"),
        t("leaveType.success.deleted")
      );
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t("common.systemError");

      alertError(t("common.deleteFailed"), msg);
    }
  };

  /* ========================= Pagination ========================= */
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => {
    const total = leaveTypes?.length || 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [leaveTypes]);

  // ถ้าจำนวนรายการเปลี่ยน (เพิ่ม/ลบ) แล้วหน้าเกิน ให้ดึงกลับ
  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedLeaveTypes = useMemo(() => {
    const list = leaveTypes || [];
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [leaveTypes, page]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goPrev = () => canPrev && setPage((p) => p - 1);
  const goNext = () => canNext && setPage((p) => p + 1);
  const goTo = (n) => setPage(Math.min(Math.max(1, n), totalPages));

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const pages = [];

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + (maxButtons - 1));

    start = Math.max(1, end - (maxButtons - 1));

    if (start > 1) pages.push(1);
    if (start > 2) pages.push("...");

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages - 1) pages.push("...");
    if (end < totalPages) pages.push(totalPages);

    return pages;
  }, [page, totalPages]);

  /* ========================= Render ========================= */
  return (
    <>
      {/* ========================= FORM CARD POPUP ========================= */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setFormOpen(false);
            resetForm();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFormOpen(false);
              resetForm();
            }
          }}
          tabIndex={-1}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-3xl rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()} // กันคลิกทะลุไปปิด
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-widest text-slate-800">
                  {editId ? t("leaveType.form.editTitle") : t("leaveType.form.addTitle")}
                </div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {t("leaveType.form.subtitle")}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="h-10 w-10 rounded-2xl border border-gray-200 bg-white text-slate-700
                  font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
                  inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
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
                    onChange={(e) => setLabel({ ...label, th: e.target.value })}
                  />
                </div>

                {/* Label EN */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t("leaveType.form.labelEn")}
                  </label>
                  <input
                    placeholder="EN"
                    className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                      text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    value={label.en}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLabel((prev) => ({ ...prev, en: value }));
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
                    min={0}
                    className="h-11 px-5 rounded-2xl border border-gray-200 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
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
                    min={0}
                    className="h-11 px-5 rounded-2xl border border-gray-200 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    value={maxConsecutiveDays}
                    onChange={(e) => setMaxConsecutiveDays(e.target.value)}
                  />
                </div>

                {/* Paid */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t("leaveType.form.paid")}
                  </label>
                  <select
                    className="h-11 px-5 rounded-2xl border border-gray-200 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                    value={isPaid ? "1" : "0"}
                    onChange={(e) => setIsPaid(e.target.value === "1")}
                  >
                    <option value="1">{t("common.yes")}</option>
                    <option value="0">{t("common.no")}</option>
                  </select>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                    uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100
                    inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  {editId ? t("leaveType.form.update") : t("leaveType.form.add")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================= TABLE CARD ========================= */}
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
          {leaveTypes.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {t("common.page")} {page} / {totalPages} • {t("common.showing")}{" "}
                <span className="text-slate-700">
                  {Math.min((page - 1) * PAGE_SIZE + 1, leaveTypes.length)}-
                  {Math.min(page * PAGE_SIZE, leaveTypes.length)}
                </span>{" "}
                {t("common.of")}{" "}
                <span className="text-slate-700">{leaveTypes.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canPrev}
                  className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                    ${
                      canPrev
                        ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                        : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                    }`}
                >
                  <ChevronLeft size={14} />
                  {t("common.prev")}
                </button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span
                        key={`dots-${idx}`}
                        className="px-2 text-gray-300 font-black text-[12px]"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goTo(p)}
                        className={`h-9 min-w-[38px] px-3 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95
                          ${
                            p === page
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canNext}
                  className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                    ${
                      canNext
                        ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                        : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                    }`}
                >
                  {t("common.next")}
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
