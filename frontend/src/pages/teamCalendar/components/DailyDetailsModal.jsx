// src/pages/teamCalendar/components/DailyDetailsModal.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Image as ImageIcon,
  MessageCircle,
  Info,
} from "lucide-react";

import {
  updateLeaveStatus,
  grantSpecialLeave,
  getLeaveTypes,
} from "../../../api/leaveService";
import {
  alertConfirm,
  alertSuccess,
  alertError,
  alertRejectReason,
} from "../../../utils/sweetAlert";
import { openAttachment } from "../../../utils/attachmentPreview";

import Pill from "./Pill";
import TabButton from "./TabButton";
import RoleDropdown from "./RoleDropdown";
import DepartmentDropdown from "./DepartmentDropdown";

import { buildRowName, buildDurationText, typeBadgeTheme } from "../utils";

/* =========================
   Helpers
   ========================= */

const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return "#1f2937";
  const h = String(hexcolor).replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#1f2937";
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#1f2937" : "white";
};

const norm = (v) => String(v ?? "").trim().toLowerCase();

/**
 * ✅ Dropdown บางตัวส่ง object เช่น {key,label} / {value,label} / {id,name}
 * ต้องดึง "key" ออกมาก่อน ไม่งั้นจะกลายเป็น "[object Object]"
 */
const pickKey = (v) => {
  if (v && typeof v === "object") {
    // พยายามดึงค่าที่ “เป็น key จริง” ก่อน
    return (
      v.key ??
      v.value ??
      v.id ??
      v.code ??
      v.name ??
      v.type ??
      v.typeName ??
      v.label ??
      ""
    );
  }
  return v ?? "";
};

/**
 * ✅ Normalize ค่า filter ให้เป็น key มาตรฐาน
 * - "ALL", "All Departments", "ALL ROLES" -> "ALL"
 * - อื่น ๆ -> UPPER + trim
 */
const normalizeKey = (v) => {
  const raw = pickKey(v);
  const s = String(raw ?? "").trim().toUpperCase();
  const compact = s.replace(/\s+/g, "");
  if (!s) return "ALL";

  if (s === "ALL") return "ALL";
  if (s.startsWith("ALL ")) return "ALL";
  if (compact === "ALLROLES" || compact === "ALLDEPARTMENTS") return "ALL";
  if (compact === "ALLDEPARTMENT" || compact === "ALLDEPTS") return "ALL";
  if (compact === "ALLROLE") return "ALL";

  return s;
};

/**
 * ✅ รวมค่าที่เป็น “department” จากหลาย field ที่เป็นไปได้
 * แล้ว map ให้เป็น key มาตรฐาน (HR/GA/IT/...)
 */
const resolveDepartmentKey = (leaf) => {
  const raw =
    leaf?.department ||
    leaf?.departmentName ||
    leaf?.department?.name ||
    leaf?.employee?.department ||
    leaf?.employee?.departmentName ||
    leaf?.employee?.department?.name ||
    "";

  const s = String(raw ?? "").trim();
  if (!s) return "-";

  // ใช้ค่าจาก DB ตรง ๆ (normalize แค่รูปแบบ)
  return s.toUpperCase();
};

/**
 * ✅ รวมค่าที่เป็น “role” จากหลาย field ที่เป็นไปได้
 * แล้ว map ให้เป็น key มาตรฐาน (WORKER/HR/...)
 */
const resolveRoleKey = (leaf) => {
  // ✅ ใช้ key จาก BE ก่อนเสมอ
  const raw =
    leaf?.roleKey ||
    leaf?.roleName ||
    leaf?.role ||
    leaf?.employee?.role?.name ||
    leaf?.employee?.role ||
    leaf?.position ||
    "";

  const s = String(raw ?? "").trim();
  if (!s) return "-";

  return s.toUpperCase().replace(/\s+/g, " ").trim();
};

export default function DailyDetailsModal({
  open,
  onClose,

  selectedDate,
  modalSummary,
  shiftDay,
  goToday,

  tab,
  setTab,

  roleFilter,
  setRoleFilter,
  roleOpen,
  setRoleOpen,

  search,
  setSearch,

  loading,
  rows,

  refetchLeaves,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // ✅ Department filter (local state)
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [deptOpen, setDeptOpen] = useState(false);

  const onDeptChange = useCallback((v) => {
    setDeptFilter(normalizeKey(v));
  }, []);

  const onRoleChange = useCallback(
    (v) => {
      setRoleFilter?.(normalizeKey(v));
    },
    [setRoleFilter]
  );

  // Leave types map (label/color)
  const [leaveTypeMap, setLeaveTypeMap] = useState({});

  useEffect(() => {
    if (!open) return;
    let active = true;

    (async () => {
      try {
        const data = await getLeaveTypes();
        if (!active) return;

        const map = {};
        (data || []).forEach((lt) => {
          const key = String(lt.typeName || "").trim().toUpperCase();
          if (!key) return;
          map[key] = { label: lt.label || null, color: lt.color || null };
        });

        setLeaveTypeMap(map);
      } catch {
        if (!active) return;
        setLeaveTypeMap({});
      }
    })();

    return () => {
      active = false;
    };
  }, [open]);

  // ✅ dept options มาจาก “departmentKey ที่ resolve แล้ว”
  const deptKeys = useMemo(() => {
    const set = new Set();
    (rows || []).forEach((leaf) => {
      const dKey = resolveDepartmentKey(leaf);
      if (!dKey || dKey === "-") return;
      set.add(String(dKey).toUpperCase());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const roleKeys = useMemo(() => {
    const set = new Set();
    (rows || []).forEach((leaf) => {
      const rKey = resolveRoleKey(leaf);
      if (!rKey || rKey === "-") return;
      set.add(String(rKey).toUpperCase());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    console.log("ROLE KEYS:", roleKeys);
    console.log("SAMPLE ROW:", rows?.[0]);
  }, [roleKeys, rows]);

  useEffect(() => {
    if (!rows?.length) return;

    console.log("SAMPLE ROW:", rows[0]);
    console.log("EMPLOYEE:", rows[0].employee);
    console.log("ROLE:", rows[0].employee?.role);
    console.log("DEPARTMENT:", rows[0].employee?.department);

  }, [rows]);


  // รองรับ DepartmentDropdown ที่ต้องการ object items
  const deptItems = deptKeys.map((k) => ({ id: k, label: k, }));
  const roleItems = roleKeys.map((k) => ({ id: k, label: k, }));


  const resolveLeaveLabel = useCallback(
    (leaf) => {
      if (leaf?.label && typeof leaf.label === "object") {
        return (
          leaf.label[lang] ||
          leaf.label?.[lang?.split("-")?.[0]] ||
          leaf.label.en ||
          Object.values(leaf.label)[0] ||
          leaf?.typeName ||
          leaf?.type ||
          "-"
        );
      }

      const key = String(leaf?.typeName || leaf?.type || "").trim().toUpperCase();
      const fromType = leaveTypeMap[key]?.label;

      if (fromType && typeof fromType === "object") {
        return (
          fromType[lang] ||
          fromType?.[lang?.split("-")?.[0]] ||
          fromType.en ||
          Object.values(fromType)[0] ||
          leaf?.typeName ||
          leaf?.type ||
          "-"
        );
      }

      return leaf?.typeName || leaf?.type || "-";
    },
    [leaveTypeMap, lang]
  );

  const resolveLeaveColor = useCallback(
    (leaf) => {
      const key = String(leaf?.typeName || leaf?.type || "").trim().toUpperCase();
      return leaveTypeMap[key]?.color || null;
    },
    [leaveTypeMap]
  );

  const filteredRows = useMemo(() => {
    const rf = normalizeKey(roleFilter);
    const df = normalizeKey(deptFilter);
    const q = norm(search);

    return (rows || []).filter((leaf) => {
      // department
      if (df !== "ALL") {
        const dKey = normalizeKey(resolveDepartmentKey(leaf));
        if (dKey !== df) return false;
      }

      // role
      if (rf !== "ALL") {
        const rKey = normalizeKey(resolveRoleKey(leaf));
        if (rKey !== rf) return false;
      }

      // search
      if (q) {
        const name = buildRowName(leaf);
        const type = resolveLeaveLabel(leaf);
        const dKey = resolveDepartmentKey(leaf);
        const rKey = resolveRoleKey(leaf);
        const hay = norm([name, type, dKey, rKey, leaf?.reason, leaf?.note].join(" "));
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [rows, roleFilter, deptFilter, search, resolveLeaveLabel]);

  const handleLeaveActionInModal = useCallback(
    async (mode, leaf) => {
      if (!leaf?.id) return;

      const modeLower = String(mode || "").toLowerCase();
      const isReject = modeLower === "rejected" || modeLower === "reject";

      const actionText =
        mode === "Special"
          ? t("teamCalendar.modal.actions.specialFull")
          : mode === "Approved"
          ? t("teamCalendar.modal.actions.approveFull")
          : t("teamCalendar.modal.actions.rejectFull");

      try {
        let rejectionReason = null;

        if (isReject) {
          rejectionReason = await alertRejectReason();
          if (!rejectionReason) return;
        } else {
          const ok = await alertConfirm(
            t("teamCalendar.modal.confirm.title", { action: actionText }),
            t("teamCalendar.modal.confirm.text", {
              name: buildRowName(leaf),
              action: actionText,
            })
          );
          if (!ok) return;
        }

        if (mode === "Special") {
          await grantSpecialLeave({
            employeeId: leaf.employeeId ?? leaf.employee?.id,
            amount: leaf.totalDaysRequested ?? 1,
            reason: `${t("teamCalendar.modal.specialReasonPrefix")}: ${
              leaf.reason || leaf.note || t("teamCalendar.modal.noReason")
            }`,
            year: new Date(leaf.startDate).getFullYear(),
            leaveRequestId: leaf.id,
          });
        } else {
          const finalStatus = isReject ? "Rejected" : mode;
          await updateLeaveStatus(leaf.id, finalStatus, isReject ? rejectionReason : null);
        }

        await alertSuccess(t("common.success"), t("teamCalendar.modal.toast.processedOne"));
        await refetchLeaves?.();
      } catch (err) {
        alertError(
          t("teamCalendar.modal.toast.actionFailedTitle"),
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            t("teamCalendar.modal.toast.unknownError")
        );
        // เงียบไว้ใน prod; แต่ยัง log error เพื่อ devtools
        console.error(err);
      }
    },
    [refetchLeaves, t]
  );

  // reset filters when close
  useEffect(() => {
    if (!open) {
      setDeptOpen(false);
      setDeptFilter("ALL");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-[1500px] max-h-[94vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        {/* Top Bar */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 leading-none">
                {t("teamCalendar.modal.title")}
              </div>
              <div className="mt-2 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {format(selectedDate, "dd MMMM yyyy")}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center"
              title={t("teamCalendar.actions.close")}
              aria-label={t("teamCalendar.actions.close")}
            >
              <X size={22} />
            </button>
          </div>

          {/* Summary + Day Nav */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill color="bg-emerald-100 text-emerald-700" label={t("teamCalendar.modal.pills.checkedIn")} value={modalSummary?.checkedIn ?? 0} />
              <Pill color="bg-rose-100 text-rose-700" label={t("teamCalendar.modal.pills.late")} value={modalSummary?.late ?? 0} />
              <Pill color="bg-slate-100 text-slate-700" label={t("teamCalendar.modal.pills.absent")} value={modalSummary?.absent ?? 0} />
              <Pill color="bg-sky-100 text-sky-700" label={t("teamCalendar.modal.pills.onLeave")} value={modalSummary?.onLeave ?? 0} />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => shiftDay?.(-1)}
                className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
                aria-label={t("teamCalendar.modal.nav.prevDay")}
                title={t("teamCalendar.modal.nav.prevDay")}
              >
                {"<"}
              </button>

              <button
                onClick={() => goToday?.()}
                className="h-11 px-5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
                aria-label={t("teamCalendar.actions.today")}
                title={t("teamCalendar.actions.today")}
              >
                {t("teamCalendar.actions.today")}
              </button>

              <button
                onClick={() => shiftDay?.(1)}
                className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
                aria-label={t("teamCalendar.modal.nav.nextDay")}
                title={t("teamCalendar.modal.nav.nextDay")}
              >
                {">"}
              </button>
            </div>
          </div>

          {/* Tabs + Filters */}
          <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TabButton
                active={tab === "PENDING"}
                onClick={() => {
                  setTab?.("PENDING");
                  setRoleOpen?.(false);
                  setDeptOpen(false);
                }}
                label={t("teamCalendar.modal.tabs.pending")}
                icon={<Clock size={14} />}
              />
              <TabButton
                active={tab === "APPROVED"}
                onClick={() => {
                  setTab?.("APPROVED");
                  setRoleOpen?.(false);
                  setDeptOpen(false);
                }}
                label={t("teamCalendar.modal.tabs.approved")}
                icon={<CheckCircle2 size={14} />}
              />
              <TabButton
                active={tab === "REJECTED"}
                onClick={() => {
                  setTab?.("REJECTED");
                  setRoleOpen?.(false);
                  setDeptOpen(false);
                }}
                label={t("teamCalendar.modal.tabs.rejected")}
                icon={<XCircle size={14} />}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              <DepartmentDropdown
                value={deptFilter}
                onChange={onDeptChange}
                open={deptOpen}
                setOpen={setDeptOpen}
                widthClass="w-full sm:w-[200px]"
                size="sm"
                items={deptItems}
              />

              <RoleDropdown
                value={roleFilter}
                onChange={onRoleChange}
                items={roleItems}
                open={roleOpen}
                setOpen={setRoleOpen}
                widthClass="w-full sm:w-[180px]"
                size="sm"
              />

              <input
                value={search || ""}
                onChange={(e) => setSearch?.(e.target.value)}
                placeholder={t("teamCalendar.modal.searchPlaceholder")}
                className="w-full sm:w-[320px] h-11 px-4 rounded-2xl bg-white border border-slate-200
                          text-slate-800 font-black text-[11px]
                          placeholder:text-slate-300 placeholder:font-black
                          outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="p-4 sm:p-6 overflow-auto max-h-[calc(92vh-240px)]">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      {t("teamCalendar.modal.table.employee")}
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      {t("teamCalendar.modal.table.type")}
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      {t("teamCalendar.modal.table.noteReason")}
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      {t("teamCalendar.modal.table.duration")}
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                      {t("teamCalendar.modal.table.evidence")}
                    </th>
                    <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                      {tab === "APPROVED"
                        ? t("teamCalendar.modal.table.approvedBy")
                        : tab === "REJECTED"
                        ? t("teamCalendar.modal.table.rejectedBy")
                        : t("teamCalendar.modal.table.action")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center font-black italic text-blue-500 animate-pulse">
                        {t("teamCalendar.modal.loading")}
                      </td>
                    </tr>
                  ) : (filteredRows || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center text-slate-300 font-black uppercase text-sm">
                        {t("teamCalendar.modal.noData")}
                      </td>
                    </tr>
                  ) : (
                    (filteredRows || []).map((leaf) => {
                      const name = buildRowName(leaf);
                      const rawType = String(leaf.type || leaf.typeName || "-");
                      const dur = buildDurationText(leaf);

                      const displayLabel = resolveLeaveLabel(leaf);
                      const customColor = resolveLeaveColor(leaf);

                      const deptKey = resolveDepartmentKey(leaf);

                      const showHrName =
                        tab === "APPROVED"
                          ? leaf.approvedBy || leaf.actedByHrName || "-"
                          : tab === "REJECTED"
                          ? leaf.rejectedBy || leaf.actedByHrName || "-"
                          : null;

                      return (
                        <tr key={leaf.id} className="hover:bg-slate-50/50 transition-all duration-200">
                          <td className="p-5 min-w-[200px]">
                            <div className="font-black text-slate-700 leading-none tracking-tight">{name}</div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {deptKey && deptKey !== "-" && (
                                <span
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full
                                            text-[10px] font-black uppercase tracking-widest
                                            bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm"
                                  title={`Department: ${deptKey}`}
                                >
                                  {deptKey}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-5">
                            {customColor ? (
                              <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border shadow-sm"
                                style={{
                                  backgroundColor: customColor,
                                  borderColor: customColor,
                                  color: getContrastYIQ(customColor),
                                }}
                              >
                                {displayLabel}
                              </span>
                            ) : (
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${typeBadgeTheme(
                                  rawType
                                )}`}
                              >
                                {displayLabel}
                              </span>
                            )}
                          </td>

                          <td className="p-5 min-w-[260px]">
                            <div className="flex flex-col gap-1">
                              {leaf.reason && (
                                <div className="flex items-start gap-1 text-slate-500 text-[11px] leading-tight">
                                  <MessageCircle size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                  <span className="truncate max-w-[240px]">{leaf.reason}</span>
                                </div>
                              )}
                              {leaf.note && (
                                <div className="flex items-start gap-1 text-amber-600 text-[11px] leading-tight">
                                  <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                                  <span className="truncate max-w-[240px]">{leaf.note}</span>
                                </div>
                              )}
                              {!leaf.reason && !leaf.note && <span className="text-slate-300 text-[10px] italic">-</span>}
                            </div>
                          </td>

                          <td className="p-5 min-w-[220px]">
                            <div className="text-[11px] font-bold text-slate-500 italic whitespace-nowrap">{dur.range}</div>
                            <div className="font-black text-slate-800 text-sm mt-0.5">{dur.days || "-"}</div>
                          </td>

                          <td className="p-5 text-center">
                            {leaf.attachmentUrl ? (
                              <button
                                onClick={() => openAttachment(leaf.attachmentUrl)}
                                className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all group"
                                title={t("teamCalendar.modal.tooltips.viewAttachment")}
                              >
                                <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                              </button>
                            ) : (
                              <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest italic">
                                {t("teamCalendar.modal.noFile")}
                              </span>
                            )}
                          </td>

                          <td className="p-5 text-center min-w-[220px]">
                            {tab === "PENDING" ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleLeaveActionInModal("Approved", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-100"
                                >
                                  <span className="text-sm font-medium">{t("teamCalendar.modal.actions.approve")}</span>
                                </button>

                                <button
                                  onClick={() => handleLeaveActionInModal("Special", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-purple-100"
                                >
                                  <Star size={16} />
                                  <span className="text-sm font-medium">{t("teamCalendar.modal.actions.special")}</span>
                                </button>

                                <button
                                  onClick={() => handleLeaveActionInModal("Rejected", leaf)}
                                  className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100"
                                >
                                  <span className="text-sm font-medium">{t("teamCalendar.modal.actions.reject")}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-700">
                                {showHrName || "-"}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 text-[10px] text-slate-300 font-black uppercase tracking-widest">
            {t("teamCalendar.modal.hrNameHint")}
          </div>
        </div>
      </div>
    </div>
  );
}
