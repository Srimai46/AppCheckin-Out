import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getAttendanceStats } from "../api/attendanceService";
import api from "../api/axios";
import DateGridPicker from "../components/shared/DateGridPicker";
import {
  Calendar,
  Clock,
  User,
  Briefcase,
  CheckCircle2,
  XCircle,
  Timer,
  Filter,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// --- Components ย่อย: Card แสดงตัวเลข ---
const StatCard = ({ title, value, subValue, icon: Icon, colorClass, bgClass }) => (
  <div className={`p-6 rounded-[2rem] border transition-all hover:shadow-lg ${bgClass} border-transparent`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
        {subValue && (
          <p className="text-xs font-bold mt-1 opacity-80 flex items-center gap-1">{subValue}</p>
        )}
      </div>
      <div className={`p-3 rounded-2xl ${colorClass} text-white shadow-sm`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

// --- Components ย่อย: ปฏิทิน ---
const AttendanceCalendar = ({ year, month, stats }) => {
  if (month === "All") return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <Calendar size={48} className="mb-4 opacity-20" />
      <p className="font-bold">Please select a specific month to view the calendar.</p>
    </div>
  );

  const monthIndex = parseInt(month) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday

  const getDateStr = (day) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // ✅ Helper: แปลงค่าที่เป็น Object {en, th} ให้เป็น String เพื่อป้องกัน Error
  const getStringLabel = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      return val.en || val.th || ""; // เลือก Eng ก่อน ถ้าไม่มีเอา Thai
    }
    return String(val);
  };

  const days = [];
  // ช่องว่างสำหรับวันก่อนวันที่ 1
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 md:h-32"></div>);
  }

  // Loop วาดวันที่
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = getDateStr(d);
    
    // 🔥 เก็บรายการเหตุการณ์ทั้งหมดในวันนี้ (Array)
    const events = [];

    // 1. วันหยุด (Priority สูงสุด)
    const holidayObj = stats.holidayDates?.find(h => h.date === dateStr);
    if (holidayObj) {
      events.push({ 
        label: getStringLabel(holidayObj.name), // ✅ ใช้ getStringLabel
        color: "bg-purple-500 text-white shadow-purple-200" 
      });
    }

    // 2. วันลา (Leave)
    const leaveObj = stats.leaveDates?.find((l) => l.date === dateStr);
    if (leaveObj) {
      events.push({ 
        label: getStringLabel(leaveObj.type), // ✅ ใช้ getStringLabel
        color: "bg-blue-500 text-white shadow-blue-200" 
      });
    }

    // 3. ขาดงาน (Absent)
    const isAbsent = stats.absentDates?.some(a => a === dateStr || a.startsWith(dateStr));
    if (isAbsent) {
      events.push({ label: "Absent", color: "bg-rose-500 text-white shadow-rose-200" });
    }

    // 4. มาสาย (Late)
    if (stats.lateDates?.includes(dateStr)) {
      events.push({ label: "Late", color: "bg-amber-400 text-white shadow-amber-200" });
    }

    // 5. กลับก่อน (Early)
    if (stats.earlyLeaveDates?.includes(dateStr)) {
      events.push({ label: "Early", color: "bg-orange-400 text-white shadow-orange-200" });
    }

    days.push(
      <div
        key={d}
        className="min-h-[6rem] md:min-h-[8rem] border border-slate-100 rounded-2xl p-2 relative group hover:border-blue-200 transition-all bg-white flex flex-col justify-between"
      >
        <span className={`text-sm font-bold block mb-1 ${holidayObj ? 'text-purple-600' : 'text-slate-700'}`}>
            {d}
        </span>

        {/* พื้นที่แสดง Badges (รองรับหลายอัน) */}
        <div className="flex flex-col gap-1 overflow-hidden">
            {events.map((ev, idx) => (
                <div 
                    key={idx}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider truncate w-full shadow-sm ${ev.color}`}
                    title={ev.label}
                >
                    {ev.label}
                </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2 md:gap-4">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="text-center text-[10px] font-black uppercase text-slate-300 tracking-widest py-2">
          {day}
        </div>
      ))}
      {days}
    </div>
  );
};

// --- Main Component ---
export default function AttendanceDashboard() {
  const { user } = useAuth();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const pad2 = (n) => String(n).padStart(2, "0");

  const filterLabel = useMemo(() => {
    if (month === "All") return `ALL ${year}`;
    return `${pad2(month)}/${year}`;
  }, [month, year]);

  // Fetch Employees (Only HR)
  useEffect(() => {
    if (user?.role === "HR") {
      api
        .get("/employees")
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data.employees || [];
          setEmployees(list);
        })
        .catch(console.error);
    }
  }, [user]);

  // Fetch Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        const data = await getAttendanceStats({
          year,
          month,
          employeeId: user.role === "HR" && selectedEmployeeId ? selectedEmployeeId : undefined,
        });

        // ✅ Map Data ให้ตรงกับ Backend ใหม่
        setStats({
            ...data.stats,
            employeeName: data.employee?.name 
        });

      } catch (err) {
        console.error("Fetch Stats Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [year, month, selectedEmployeeId, user]);

  const attendanceRatioData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Present", value: stats.present, color: "#10B981" },
      { name: "Leave", value: stats.leave, color: "#3B82F6" },
      { name: "Absent", value: stats.absent, color: "#F43F5E" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const leaveBreakdownData = useMemo(() => {
    if (!stats?.leaveBreakdown) return [];
    const COLORS = ["#8B5CF6", "#F59E0B", "#6366F1", "#EC4899", "#14B8A6", "#F43F5E"];
    return Object.entries(stats.leaveBreakdown).map(([key, value], index) => ({
      name: key,
      value: value,
      color: COLORS[index % COLORS.length],
    }));
  }, [stats]);

  if (loading && !stats)
    return (
      <div className="p-10 flex justify-center text-blue-600 font-bold animate-pulse">
        Loading Dashboard...
      </div>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Clock className="text-blue-600" size={32} />
            Attendance Stats
          </h1>
          <p className="text-slate-400 font-bold mt-2 flex items-center gap-2">
            <User size={16} />
            Viewing:{" "}
            <span className="text-slate-600">
              {stats ? stats.employeeName || "My Dashboard" : "Loading..."}
            </span>
            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {user.role === "HR" && selectedEmployeeId ? "Employee View" : user.role}
            </span>
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
            title="Filter by year/month"
          >
            <Filter size={16} className="text-slate-400" />
            {filterLabel}
          </button>

          <button
            type="button"
            onClick={() => {
              setYear(new Date().getFullYear());
              setMonth("All");
            }}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-black py-2 px-4 rounded-xl transition-all text-[11px] uppercase tracking-widest active:scale-95"
            title="Clear filter"
          >
            CLEAR
          </button>

          <DateGridPicker
            open={datePickerOpen}
            value={
              month === "All"
                ? `${year}`
                : `${year}-${pad2(month)}`
            }
            granularity="month"
            allowAll={true}
            title="Select Year / Month"
            onClose={() => setDatePickerOpen(false)}
            onChange={(val) => {
              if (!val) {
                setMonth("All");
                setYear(new Date().getFullYear());
                return;
              }
              const s = String(val);
              if (/^\d{4}$/.test(s)) {
                setYear(Number(s));
                setMonth("All");
                return;
              }
              const m = s.match(/^(\d{4})-(\d{2})$/);
              if (m) {
                setYear(Number(m[1]));
                setMonth(Number(m[2]));
              }
            }}
          />

          {user.role === "HR" && (
            <div className="relative">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="appearance-none bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 font-bold py-2 pl-4 pr-10 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-sm min-w-[150px]"
              >
                <option value="">View My Stats</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
              <User className="absolute right-3 top-2.5 text-blue-400 pointer-events-none" size={16} />
            </div>
          )}
        </div>
      </div>

      {/* 2. Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Working Days"
            value={`${stats.present}/${stats.totalDaysExpected}`}
            subValue="Present / Expected"
            icon={Briefcase}
            bgClass="bg-blue-50/50 hover:bg-blue-50"
            colorClass="bg-blue-500"
          />
          <StatCard
            title="Late Arrivals"
            value={stats.late}
            subValue={`Total ${stats.lateMinutes || 0} mins`}
            icon={Clock}
            bgClass="bg-amber-50/50 hover:bg-amber-50"
            colorClass="bg-amber-500"
          />
          <StatCard
            title="Early Leaves"
            value={stats.earlyLeave}
            subValue={`Total ${stats.earlyLeaveMinutes || 0} mins`}
            icon={Timer}
            bgClass="bg-orange-50/50 hover:bg-orange-50"
            colorClass="bg-orange-500"
          />
          <StatCard
            title="Approved Leaves"
            value={stats.leave}
            subValue="Days Taken"
            icon={CheckCircle2}
            bgClass="bg-emerald-50/50 hover:bg-emerald-50"
            colorClass="bg-emerald-500"
          />
          <StatCard
            title="Absences"
            value={stats.absent}
            subValue="Unexcused Days"
            icon={XCircle}
            bgClass="bg-rose-50/50 hover:bg-rose-50 ring-1 ring-rose-100"
            colorClass="bg-rose-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Charts Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-80">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <PieChartIcon size={20} className="text-slate-400" /> Attendance Ratio
            </h3>
            <div className="h-60 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendanceRatioData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {attendanceRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {leaveBreakdownData.length > 0 && (
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-80">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                <Filter size={20} className="text-slate-400" /> Leave Types
              </h3>
              <div className="h-60 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leaveBreakdownData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {leaveBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* 4. Calendar Section */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
                <Calendar className="text-blue-500" />
                {month === "All"
                  ? "Yearly Overview"
                  : `${new Date(0, month - 1).toLocaleString("en-US", { month: "long" })} Calendar`}
              </h3>

              {/* Legend Summary */}
              <div className="hidden sm:flex flex-wrap gap-2">
                <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>Holiday
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>Absent
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>Late
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>Early
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>Leave
                </span>
              </div>
            </div>

            {stats && <AttendanceCalendar year={year} month={month} stats={stats} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon Helper
const PieChartIcon = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);