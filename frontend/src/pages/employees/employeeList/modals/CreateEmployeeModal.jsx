// frontend/src/pages/employees/employeeList/modals/CreateEmployeeModal.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  ChevronDown,
  ShieldCheck,
  Briefcase,
  KeyRound,
  Building2,
} from "lucide-react";
import DateGridPicker from "../../../../components/shared/DateGridPicker";
import api from "../../../../api/axios";

export default function CreateEmployeeModal({
  open,
  onClose,
  onCreated,
  isLoading,
  roleOpen,
  setRoleOpen,
}) {
  const { t } = useTranslation();

  // -------------------------
  // Dropdown states
  // -------------------------
  const [deptOpen, setDeptOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  // -------------------------
  // Dynamic options from DB
  // -------------------------
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState("");

  // -------------------------
  // Form
  // -------------------------
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    roleId: null,
    departmentId: null,
    joiningDate: "", // YYYY-MM-DD
  });

  // -------------------------
  // Helpers
  // -------------------------
  const toDisplay = (ymd) => {
    if (!ymd) return "";
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    return `${m[3]}/${m[2]}/${m[1]}`;
  };

  const pickDefaultRoleId = (items = []) => {
    const byWorker = items.find((r) => String(r.name).toUpperCase() === "WORKER");
    return (byWorker || items[0])?.id ?? null;
  };

  const pickDefaultDeptId = (items = []) => {
    const byGeneral = items.find((d) => String(d.name).toUpperCase() === "GENERAL");
    return (byGeneral || items[0])?.id ?? null;
  };

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === formData.roleId) || null,
    [roles, formData.roleId]
  );

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === formData.departmentId) || null,
    [departments, formData.departmentId]
  );

  const roleIsHR = useMemo(() => {
    const n = String(selectedRole?.name || "").toUpperCase();
    return n === "HR" || n === "ADMIN";
  }, [selectedRole]);

  const roleLabel = useMemo(() => {
    const n = String(selectedRole?.name || "").toUpperCase();
    if (n === "HR") return t("employeeCreate.roleHR");
    if (n === "WORKER") return t("employeeCreate.roleWorker");
    if (n) return selectedRole?.name;
    return "-";
  }, [selectedRole, t]);

  const deptNameLabel = useMemo(() => {
    const name = String(selectedDept?.name || "").toUpperCase();
    if (!name) return "-";
    const key = `employeeCreate.dept_${name}`;
    const translated = t(key);
    return translated !== key ? translated : (selectedDept?.name || "-");
  }, [selectedDept, t]);

  const deptSubLabel = useMemo(() => {
    const desc = String(selectedDept?.description || "").trim();
    if (desc) return desc;
    const name = String(selectedDept?.name || "").trim();
    return name || "-";
  }, [selectedDept]);

  // -------------------------
  // Load options when modal open
  // -------------------------
  useEffect(() => {
    if (!open) return;

    setRoleOpen(false);
    setDeptOpen(false);
    setJoinOpen(false);
    setOptionsError("");
    setLoadingOptions(true);

    Promise.all([api.get("/employees/roles"), api.get("/employees/departments")])
      .then(([roleRes, deptRes]) => {
        const roleItems = Array.isArray(roleRes.data) ? roleRes.data : [];
        const deptItems = Array.isArray(deptRes.data) ? deptRes.data : [];

        setRoles(roleItems);
        setDepartments(deptItems);

        const defaultRoleId = pickDefaultRoleId(roleItems);
        const defaultDeptId = pickDefaultDeptId(deptItems);

        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          roleId: defaultRoleId,
          departmentId: defaultDeptId,
          joiningDate: "",
        });
      })
      .catch((err) => {
        console.error(err);
        setRoles([]);
        setDepartments([]);
        setOptionsError(t("employeeCreate.loadOptionsFailed") || "Failed to load options");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          roleId: null,
          departmentId: null,
          joiningDate: "",
        });
      })
      .finally(() => setLoadingOptions(false));
  }, [open, setRoleOpen, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-white w-full max-w-lg max-h-[calc(100vh-2.5rem)] rounded-[2rem] p-6 space-y-4 animate-in zoom-in duration-300 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {t("employeeCreate.title")}
          </h2>

          <button
            type="button"
            onClick={() => {
              if (isLoading) return;
              setRoleOpen(false);
              setDeptOpen(false);
              setJoinOpen(false);
              onClose();
            }}
            className="ml-auto text-gray-400 hover:text-rose-500 transition-colors"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={22} />
          </button>
        </div>

        {/* Optional banner error */}
        {optionsError ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700 font-bold text-[12px]">
            {optionsError}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreated(formData);
          }}
          className="space-y-3 text-left"
        >
          {/* Name Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                {t("employeeCreate.firstName")}
              </label>
              <input
                required
                placeholder={t("employeeCreate.firstNamePlaceholder")}
                value={formData.firstName}
                onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                disabled={isLoading}
                className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                {t("employeeCreate.lastName")}
              </label>
              <input
                required
                placeholder={t("employeeCreate.lastNamePlaceholder")}
                value={formData.lastName}
                onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                disabled={isLoading}
                className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
              {t("employeeCreate.email")}
            </label>
            <input
              required
              type="email"
              placeholder={t("employeeCreate.emailPlaceholder")}
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              disabled={isLoading}
              className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 disabled:opacity-60"
            />
          </div>

          {/* Role Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
              {t("employeeCreate.role")}
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (isLoading || loadingOptions) return;
                  setDeptOpen(false);
                  setJoinOpen(false);
                  setRoleOpen((v) => !v);
                }}
                disabled={isLoading || loadingOptions}
                className={`w-full rounded-2xl px-4 py-2.5 font-bold outline-none transition-all
                  bg-gray-50 ring-1 ring-transparent hover:bg-gray-100
                  focus:ring-2 focus:ring-blue-100 disabled:opacity-60
                  ${roleOpen ? "ring-2 ring-blue-100 bg-gray-100" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                        roleIsHR
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-slate-50 text-slate-700 border-slate-100"
                      }`}
                    >
                      {roleIsHR ? <ShieldCheck size={16} /> : <Briefcase size={16} />}
                    </span>

                    <div className="text-left">
                      <div className="text-slate-800">{roleLabel}</div>
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                        {roleIsHR
                          ? t("employeeCreate.hrAccess")
                          : t("employeeCreate.workerAccess")}
                      </div>
                    </div>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${roleOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {roleOpen && (
                <>
                  <button
                    type="button"
                    onClick={() => setRoleOpen(false)}
                    className="fixed inset-0 z-[60] cursor-default"
                    aria-label={t("employeeList.aria.closeRoleDropdown")}
                  />

                  <div className="absolute z-[70] mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    {roles.length === 0 ? (
                      <div className="px-4 py-3 text-[12px] text-gray-500 font-bold">
                        {t("employeeCreate.noRoles") || "No roles found"}
                      </div>
                    ) : (
                      roles.map((r, idx) => {
                        const isSel = r.id === formData.roleId;
                        const rName = String(r.name || "").toUpperCase();
                        const isHrLike = rName === "HR" || rName === "ADMIN";
                        const rLabel =
                          rName === "HR"
                            ? t("employeeCreate.roleHR")
                            : rName === "WORKER"
                            ? t("employeeCreate.roleWorker")
                            : r.name;

                        return (
                          <div key={r.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({ ...p, roleId: r.id }));
                                setRoleOpen(false);
                              }}
                              className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all ${
                                isSel ? "bg-blue-50/40" : ""
                              }`}
                            >
                              <span
                                className={`h-9 w-9 rounded-xl border flex items-center justify-center ${
                                  isHrLike
                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                    : "bg-slate-50 text-slate-700 border-slate-100"
                                }`}
                              >
                                {isHrLike ? (
                                  <ShieldCheck size={16} />
                                ) : (
                                  <Briefcase size={16} />
                                )}
                              </span>

                              <div className="flex-1">
                                <div className="font-black text-slate-800">{rLabel}</div>
                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                  {rName}
                                </div>
                              </div>

                              {isSel && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                                  {t("employeeCreate.selected")}
                                </span>
                              )}
                            </button>

                            {idx !== roles.length - 1 && <div className="h-px bg-gray-100" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            <p className="text-[11px] text-gray-400 font-bold ml-1">
              {t("employeeCreate.roleNote")}
            </p>
          </div>

          {/* Department Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
              {t("employeeCreate.department")}
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (isLoading || loadingOptions) return;
                  setRoleOpen(false);
                  setJoinOpen(false);
                  setDeptOpen((v) => !v);
                }}
                disabled={isLoading || loadingOptions}
                className={`w-full rounded-2xl px-4 py-2.5 font-bold outline-none transition-all
                  bg-gray-50 ring-1 ring-transparent hover:bg-gray-100
                  focus:ring-2 focus:ring-blue-100 disabled:opacity-60
                  ${deptOpen ? "ring-2 ring-blue-100 bg-gray-100" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                      <Building2 size={16} />
                    </span>

                    <div className="text-left">
                      <div className="text-slate-800">{deptNameLabel}</div>
                      <div className="text-[11px] text-gray-500 font-bold">{deptSubLabel}</div>
                    </div>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${deptOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {deptOpen && (
                <>
                  <button
                    type="button"
                    onClick={() => setDeptOpen(false)}
                    className="fixed inset-0 z-[60] cursor-default"
                    aria-label={t("employeeCreate.aria.closeDepartmentDropdown")}
                  />

                  <div className="absolute z-[70] mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    {departments.length === 0 ? (
                      <div className="px-4 py-3 text-[12px] text-gray-500 font-bold">
                        {t("employeeCreate.noDepartments") || "No departments found"}
                      </div>
                    ) : (
                      departments.map((d, idx) => {
                        const isSel = d.id === formData.departmentId;
                        const dName = String(d.name || "").toUpperCase();
                        const dDesc = String(d.description || "").trim();
                        const key = `employeeCreate.dept_${dName}`;
                        const translated = t(key);
                        const topLabel = translated !== key ? translated : d.name;
                        const subLabel = dDesc || dName;

                        return (
                          <div key={d.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({ ...p, departmentId: d.id }));
                                setDeptOpen(false);
                              }}
                              className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all ${
                                isSel ? "bg-blue-50/40" : ""
                              }`}
                            >
                              <span className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                                <Building2 size={16} />
                              </span>

                              <div className="flex-1">
                                <div className="font-black text-slate-800">{topLabel}</div>
                                <div className="text-[11px] text-gray-500 font-bold">
                                  {subLabel}
                                </div>
                              </div>

                              {isSel && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                                  {t("employeeCreate.selected")}
                                </span>
                              )}
                            </button>

                            {idx !== departments.length - 1 && <div className="h-px bg-gray-100" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            <p className="text-[11px] text-gray-400 font-bold ml-1">
              {t("employeeCreate.departmentNote")}
            </p>
          </div>

          {/* Join Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
              {t("employeeCreate.joinDate")}
            </label>

            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                setRoleOpen(false);
                setDeptOpen(false);
                setJoinOpen(true);
              }}
              disabled={isLoading}
              className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 text-left"
              aria-label={t("employeeCreate.joinDate")}
              title={t("employeeCreate.joinDate")}
            >
              {formData.joiningDate ? toDisplay(formData.joiningDate) : t("employeeCreate.pickJoinDate")}
            </button>

            <DateGridPicker
              open={joinOpen}
              value={formData.joiningDate || null}
              onChange={(v) => setFormData((prev) => ({ ...prev, joiningDate: v || "" }))}
              onClose={() => setJoinOpen(false)}
              title={t("employeeCreate.joinDate")}
              allowAll={false}
              granularity="day"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-2">
              <KeyRound size={12} /> {t("employeeCreate.password")}
            </label>
            <input
              required
              type="password"
              placeholder={t("employeeCreate.passwordHint")}
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              disabled={isLoading}
              className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-amber-100 placeholder:font-medium placeholder:text-gray-300 disabled:opacity-60"
            />
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                setRoleOpen(false);
                setDeptOpen(false);
                setJoinOpen(false);
                onClose();
              }}
              disabled={isLoading}
              className="py-3 rounded-2xl font-black border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-60"
            >
              {t("employeeCreate.cancel")}
            </button>

            <button
              type="submit"
              disabled={isLoading || loadingOptions}
              className="py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none"
            >
              {isLoading ? t("employeeCreate.processing") : t("employeeCreate.submit")}
            </button>
          </div>

          {loadingOptions ? (
            <div className="text-[11px] text-gray-400 font-bold ml-1">
              {t("employeeCreate.loadingOptions") || "Loading options..."}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
