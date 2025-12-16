import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, User, Calendar } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            {user?.firstName?.[0]}
          </div>
          <div>
            <p className="font-bold text-gray-800">{user?.firstName}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} /> แดชบอร์ด
          </NavLink>
          
          {user?.role === 'Worker' && (
             <NavLink to="/leave-request" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
               <Calendar size={20} /> ยื่นใบลา
             </NavLink>
          )}
          
          {user?.role === 'HR' && (
             <NavLink to="/approvals" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
               <User size={20} /> อนุมัติคำขอ
             </NavLink>
          )}
        </nav>

        <div className="p-4 border-t">
          <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut size={20} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}