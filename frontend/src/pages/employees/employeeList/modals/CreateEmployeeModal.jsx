import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, ShieldCheck, Briefcase, KeyRound } from "lucide-react";
import DateGridPicker from "../../../../components/shared/DateGridPicker";

export default function CreateEmployeeModal({
  open,
  onClose,
  onCreated,
  isLoading,
  roleOpen,
  setRoleOpen,
}) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Worker",
    joiningDate: "", // YYYY-MM-DD
  });

  // DateGridPicker state
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // reset form every time open (เหมือน behavior เดิมที่ reset ตอนเปิด)
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "Worker",
      joiningDate: "",
    });
    setRoleOpen(false);
    setJoinOpen(false);
  }, [open, setRoleOpen]);

  // แปลง YYYY-MM-DD -> DD/MM/YYYY (แค่แสดงผล)
  const toDisplay = (ymd) => {
    if (!ymd) return "";
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    return `${m[3]}/${m[2]}/${m[1]}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in duration-300 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {t("employeeCreate.title")}
          </h2>

          <button
            type="button"
            onClick={() => {
              if (isLoading) return;
              setRoleOpen(false);
              setJoinOpen(false);
              onClose();
            }}
            className="ml-auto text-gray-400 hover:text-rose-500 transition-colors"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreated(formData);
          }}
          className="space-y-4 text-left"
        >
          {/* Name Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                {t("employeeCreate.firstName")}
              </label>
              <input
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                disabled={isLoading}
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold border-none outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                {t("employeeCreate.lastName")}
              </label>
              <input
                required
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                disabled={isLoading}
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold border-none outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
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
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={isLoading}
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 disabled:opacity-60"
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
                onClick={() => setRoleOpen((v) => !v)}
                disabled={isLoading}
                className={`w-full rounded-2xl px-4 py-3 font-bold outline-none transition-all
                  bg-gray-50 ring-1 ring-transparent hover:bg-gray-100
                  focus:ring-2 focus:ring-blue-100 disabled:opacity-60
                  ${roleOpen ? "ring-2 ring-blue-100 bg-gray-100" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                        formData.role === "HR"
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-slate-50 text-slate-700 border-slate-100"
                      }`}
                    >
                      {formData.role === "HR" ? (
                        <ShieldCheck size={16} />
                      ) : (
                        <Briefcase size={16} />
                      )}
                    </span>

                    <div className="text-left">
                      <div className="text-slate-800">
                        {formData.role === "HR"
                          ? t("employeeCreate.roleHR")
                          : t("employeeCreate.roleWorker")}
                      </div>
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                        {formData.role === "HR"
                          ? t("employeeCreate.hrAccess")
                          : t("employeeCreate.workerAccess")}
                      </div>
                    </div>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${
                      roleOpen ? "rotate-180" : ""
                    }`}
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

                  <div className="absolute z-[70] mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, role: "Worker" });
                        setRoleOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all ${
                        formData.role === "Worker" ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <span className="h-9 w-9 rounded-xl bg-slate-50 text-slate-700 border border-slate-100 flex items-center justify-center">
                        <Briefcase size={16} />
                      </span>
                      <div className="flex-1">
                        <div className="font-black text-slate-800">
                          {t("employeeCreate.roleWorker")}
                        </div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          {t("employeeCreate.workerAccess")}
                        </div>
                      </div>
                      {formData.role === "Worker" && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                          {t("employeeCreate.selected")}
                        </span>
                      )}
                    </button>

                    <div className="h-px bg-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, role: "HR" });
                        setRoleOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all ${
                        formData.role === "HR" ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                        <ShieldCheck size={16} />
                      </span>
                      <div className="flex-1">
                        <div className="font-black text-slate-800">
                          {t("employeeCreate.roleHR")}
                        </div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          {t("employeeCreate.hrAccess")}
                        </div>
                      </div>
                      {formData.role === "HR" && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                          {t("employeeCreate.selected")}
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            <p className="text-[11px] text-gray-400 font-bold ml-1">
              {t("employeeCreate.roleNote")}
            </p>
          </div>

          {/* Join Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
              {t("employeeCreate.joinDate")}
            </label>

            {/* ✅ เปลี่ยน input type=date -> ปุ่มเปิด DateGridPicker (ใช้ class เดิม) */}
            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                setRoleOpen(false);
                setJoinOpen(true);
              }}
              disabled={isLoading}
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 text-left"
              aria-label={t("employeeCreate.joinDate")}
              title={t("employeeCreate.joinDate")}
            >
              {formData.joiningDate
                ? toDisplay(formData.joiningDate)
                : t("employeeCreate.pickJoinDate")}
            </button>

            {/* ✅ DateGridPicker ใช้งานจริง */}
            <DateGridPicker
              open={joinOpen}
              value={formData.joiningDate || null}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, joiningDate: v || "" }))
              }
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
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={isLoading}
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-amber-100 placeholder:font-medium placeholder:text-gray-300 disabled:opacity-60"
            />
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                setRoleOpen(false);
                setJoinOpen(false);
                onClose();
              }}
              disabled={isLoading}
              className="py-4 rounded-2xl font-black border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-60"
            >
              {t("employeeCreate.cancel")}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none"
            >
              {isLoading ? t("employeeCreate.processing") : t("employeeCreate.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
