// frontend/src/components/shared/Layout.jsx
import { useEffect, useMemo ,useState } from "react";
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
  Settings,
  ChevronDown,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useTranslation } from "react-i18next";

/* =========================
   Section Header (IMPORTANT)
   ต้องอยู่นอก Layout เท่านั้น
========================= */
function SectionHeader({ title, open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        hidden group-hover:flex
        w-full items-center justify-between
        px-4 py-2
        text-[10px] font-black text-gray-500
        uppercase tracking-[0.2em]
        hover:text-white
      "
    >
      <span>{title}</span>
      <ChevronDown
        size={14}
        className={`transition-transform duration-200 ${
          open ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}


export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

    // =========================
  // Dropdown state
  // =========================
  const [openMenu, setOpenMenu] = useState({
    main: true,
    hr: false,
    admin: false,
  });

  const toggleMenu = (key) => {
    setOpenMenu((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // =========================
  // ✅ Languages (TH/EN/JA)
  // =========================
  const languages = useMemo(
    () => [
      { key: "th", label: "ภาษาไทย" },
      { key: "en", label: "English" },
      { key: "ja", label: "日本語" },
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

  // ✅ init language from localStorage (validate)
  useEffect(() => {
    try {
      const saved = safeGetSavedLang();
      const allow = new Set(["th", "en", "ja"]);
      const initial = allow.has(saved) ? saved : "th";

      if (i18n?.changeLanguage && i18n.language !== initial) {
        i18n.changeLanguage(initial);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ current language (th/en/ja)
  const currentLang = useMemo(() => {
    const lang = String(i18n?.language || "th").toLowerCase();
    if (lang.startsWith("ja")) return "ja";
    if (lang.startsWith("en")) return "en";
    return "th";
  }, [i18n?.language]);

  // ✅ set <html lang="...">
  useEffect(() => {
    try {
      if (typeof document === "undefined") return;
      document.documentElement.lang = currentLang === "ja" ? "ja" : currentLang === "en" ? "en" : "th";
    } catch {
      // ignore
    }
  }, [currentLang]);

  const setLang = (lang) => {
    safeSetSavedLang(lang);
    try {
      if (i18n?.changeLanguage) i18n.changeLanguage(lang);
    } catch {
      // ignore
    }
  };

  // ✅ cycle TH -> EN -> JA -> TH
  const cycleLang = () => {
    const order = ["th", "en", "ja"];
    const idx = order.indexOf(currentLang);
    const next = order[(idx + 1) % order.length];
    setLang(next);
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

        {/* Menu */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-2">
          {/* Main */}
          <SectionHeader
            title={t("layout.mainMenu")}
            open={openMenu.main}
            onClick={() => toggleMenu("main")}
          />

          {openMenu.main && (
            <>
              <NavLink to="/dashboard" className={navStyle}>
                <LayoutDashboard size={18} />
                <span className="hidden group-hover:inline font-bold text-sm">
                  {t("dashboard.attendance")}
                </span>
              </NavLink>

              <NavLink to="/attendance-dashboard" className={navStyle}>
                <CalendarDays size={18} />
                <span className="hidden group-hover:inline font-bold text-sm">
                  {t("dashboard.title")}
                </span>
              </NavLink>
            </>
          )}

          {/* HR */}
          {["HR", "ADMIN"].includes(user?.role) && (
            <>
              <SectionHeader
                title={t("layout.hrManagement")}
                open={openMenu.hr}
                onClick={() => toggleMenu("hr")}
              />

              {openMenu.hr && (
                <>
                  <NavLink to="/admin/leaves" className={navStyle}>
                    <FileCheck size={18} />
                    <span className="hidden group-hover:inline font-bold text-sm">
                      {t("layout.approveLeave")}
                    </span>
                  </NavLink>

                  <NavLink to="/employees" className={navStyle}>
                    <Users size={18} />
                    <span className="hidden group-hover:inline font-bold text-sm">
                      {t("layout.employees")}
                    </span>
                  </NavLink>

                  <NavLink to="/calendar" className={navStyle}>
                    <CalendarDays size={18} />
                    <span className="hidden group-hover:inline font-bold text-sm">
                      {t("layout.calendar")}
                    </span>
                  </NavLink>

                  <NavLink to="/year-end-processing" className={navStyle}>
                    <Settings2 size={18} />
                    <span className="hidden group-hover:inline font-bold text-sm">
                      {t("layout.yearEnd")}
                    </span>
                  </NavLink>

                  <NavLink to="/audit-log" className={navStyle}>
                    <NotebookText size={18} />
                    <span className="hidden group-hover:inline font-bold text-sm">
                      {t("layout.auditLog")}
                    </span>
                  </NavLink>
                </>
              )}
            </>
          )}

          {/* Admin */}
          {user?.role === "ADMIN" && (
            <>
              <SectionHeader
                title={t("layout.adminmanagement")}
                open={openMenu.admin}
                onClick={() => toggleMenu("admin")}
              />

              {openMenu.admin && (
                <NavLink to="/" className={navStyle}>
                  <Settings size={18} />
                  <span className="hidden group-hover:inline font-bold text-sm">
                    {t("layout.settingadmin")}
                  </span>
                </NavLink>
              )}
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
            {/* ✅ Cycle language: TH -> EN -> JA */}
            <button
              type="button"
              onClick={cycleLang}
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
              {languages.find((x) => x.key === currentLang)?.label || "TH"}
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
