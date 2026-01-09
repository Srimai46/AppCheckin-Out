// frontend/src/components/shared/Layout.jsx
import { useEffect, useMemo } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  LogOut,
  FileCheck,
  Users,
  CalendarDays,
  Menu,
  Settings2,
  NotebookText,
} from "lucide-react";
import NotificationBell from "../NotificationBell";
import { useTranslation } from "react-i18next";

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  // =========================
  // ✅ Language Tabs (TH/EN) in Layout
  // =========================
  const languages = useMemo(
    () => [
      { key: "th", label: "TH" },
      { key: "en", label: "EN" },
      // ถ้าจะเพิ่มภาษาอื่นในอนาคต แค่เติมตรงนี้
      // { key: "ja", label: "日本語" },
    ],
    []
  );

  const safeGetSavedLang = () => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem("app_lang");
    } catch {
      return null;
    }
  };

  const safeSetSavedLang = (lang) => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem("app_lang", lang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const saved = safeGetSavedLang();
      const initial = saved || "th"; // ✅ เข้าหน้ามา default เป็นไทย
      if (i18n?.changeLanguage && i18n.language !== initial) {
        i18n.changeLanguage(initial);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentLang = useMemo(() => {
    const lang = i18n?.language || "th";
    return String(lang).startsWith("en") ? "en" : "th";
  }, [i18n?.language]);

  const setLang = (lang) => {
    safeSetSavedLang(lang);
    try {
      if (i18n?.changeLanguage) i18n.changeLanguage(lang);
    } catch {
      // ignore
    }
  };

  // =========================
  // Sidebar nav style
  // =========================
  const navStyle = ({ isActive }) =>
    `flex items-center justify-center group-hover:justify-start gap-3
     px-3 group-hover:px-4 py-3 rounded-xl transition-all duration-200
     ${
       isActive
         ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
         : "text-blue-100 hover:bg-white/10 hover:text-white"
     }`;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Sidebar (Hover Expand) */}
      <aside
        className="
          group
          w-20 hover:w-64
          bg-[#001529] text-white
          flex flex-col
          shadow-2xl z-30
          transition-all duration-300 ease-in-out
          overflow-hidden
        "
      >
        {/* Header Profile */}
        <div
          className="
            p-6 border-b border-white/5 bg-[#001529]
            flex items-center gap-3
            justify-center group-hover:justify-start
          "
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg text-white shrink-0">
            {user?.firstName?.[0] || "U"}
          </div>

          <div className="hidden group-hover:block overflow-hidden min-w-0">
            <p className="font-black truncate text-sm text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              {user?.role}
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="hidden group-hover:block px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
            {t("layout.mainMenu")}
          </div>

          <NavLink to="/dashboard" className={navStyle}>
            <LayoutDashboard size={18} className="shrink-0" />
            <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
              {t("dashboard.attendance")}
            </span>
          </NavLink>

          <NavLink to="/attendance-dashboard" className={navStyle}>
            <CalendarDays size={18} className="shrink-0" />
            <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
              {t("dashboard.title")}
            </span>
          </NavLink>

          {/* HR Section */}
          {user?.role === "HR" && (
            <>
              <div className="hidden group-hover:block mt-8 mb-2 px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                {t("layout.hrManagement")}
              </div>

              <NavLink to="/admin/leaves" className={navStyle}>
                <FileCheck size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  {t("layout.approveLeave")}
                </span>
              </NavLink>

              <NavLink to="/employees" className={navStyle}>
                <Users size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  {t("layout.employees")}
                </span>
              </NavLink>

              <NavLink to="/calendar" className={navStyle}>
                <CalendarDays size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  {t("layout.calendar")}
                </span>
              </NavLink>

              <NavLink to="/year-end-processing" className={navStyle}>
                <Settings2 size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  {t("layout.yearEnd")}
                </span>
              </NavLink>

              <NavLink to="/audit-log" className={navStyle}>
                <NotebookText size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  {t("AuditLog")}
                </span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/10 bg-[#001529]">
          <button
            onClick={logout}
            className="
              w-full
              flex items-center justify-center group-hover:justify-start gap-3
              px-3 group-hover:px-4 py-3
              rounded-xl
              font-black text-sm
              transition-all duration-200
              text-red-500
              hover:text-white
              hover:bg-red-600
              hover:shadow-lg hover:shadow-red-900/40
            "
          >
            <LogOut size={18} className="shrink-0" />
            <span className="hidden group-hover:inline whitespace-nowrap">
              {t("layout.logout")}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-2 text-gray-400">
            <Menu size={20} className="md:hidden" />
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setLang(currentLang === "th" ? "en" : "th")}
              className="
                text-[16px] font-extrabold tracking-wide
                text-blue-600
                transition-colors duration-200
                hover:text-blue-800
                active:scale-95
              "
              aria-label="Toggle language"
              title="Toggle language"
            >
              {currentLang === "th" ? "TH" : "EN"}
            </button>

            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
