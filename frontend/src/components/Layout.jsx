// src/components/Layout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  LogOut,
  FileCheck,
  Users,
  CalendarDays,
  Menu,
  Settings2, // เพิ่มไอคอนสำหรับเมนูตั้งค่าปี
} from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Layout() {
  const { user, logout } = useAuth();

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
            Main Menu
          </div>

          <NavLink to="/dashboard" className={navStyle}>
            <LayoutDashboard size={18} className="shrink-0" />
            <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
              แดชบอร์ด
            </span>
          </NavLink>

          {/* HR Section */}
          {user?.role === "HR" && (
            <>
              <div className="hidden group-hover:block mt-8 mb-2 px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                HR Management
              </div>

              <NavLink to="/admin/leaves" className={navStyle}>
                <FileCheck size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  อนุมัติคำขอ
                </span>
              </NavLink>

              <NavLink to="/employees" className={navStyle}>
                <Users size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  รายชื่อพนักงาน
                </span>
              </NavLink>

              <NavLink to="/calendar" className={navStyle}>
                <CalendarDays size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  ปฏิทินทีม
                </span>
              </NavLink>

              {/* เพิ่มเมนู Year-End Processing ตรงนี้ */}
              <NavLink to="/year-end-processing" className={navStyle}>
                <Settings2 size={18} className="shrink-0" />
                <span className="hidden group-hover:inline font-bold text-sm whitespace-nowrap">
                  จัดการโควตาประจำปี
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
              ออกจากระบบ
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

          <div className="flex items-center gap-4">
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
