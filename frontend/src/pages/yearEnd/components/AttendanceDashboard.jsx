import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Briefcase,
  CheckCircle2,
  XCircle,
  Timer,
  Filter,
  PieChart as PieChartIcon, // Rename to avoid conflict
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getAttendanceStats } from "../../../../src/api/attendanceService"; // ปรับ path ตามจริง
import DateGridPicker from "../../../components/shared/DateGridPicker"; // ปรับ path ตามจริง

// --- Sub-Component: Stat Card ---
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

// --- Sub-Component: Calendar ---
const AttendanceCalendar = ({ year, month, stats }) => {
  if (month === "All") return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <Calendar size={48} className="mb-4 opacity-20" />
      <p className="font-bold">Select a specific month to view calendar.</p>
    </div>
  );

  const monthIndex = parseInt(month) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();

  const getDateStr = (day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const getStringLabel = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val.en || val.th || String(val);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-24 md:h-32"></div>);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = getDateStr(d);
    const events = [];

    // Logic การ map events (เหมือนเดิม)
    const holidayObj = stats.holidayDates?.find(h => h.date === dateStr);
    if (holidayObj) events.push({ label: getStringLabel(holidayObj.name), color: "bg-purple-500 text-white shadow-purple-200" });

    const leaveObj = stats.leaveDates?.find((l) => l.date === dateStr);
    if (leaveObj) events.push({ label: getStringLabel(leaveObj.type), color: "bg-blue-500 text-white shadow-blue-200" });

    if (stats.absentDates?.some(a => a === dateStr || a.startsWith(dateStr))) {
      events.push({ label: "Absent", color: "bg-rose-500 text-white shadow-rose-200" });
    }
    if (stats.lateDates?.includes(dateStr)) {
      events.push({ label: "Late", color: "bg-amber-400 text-white shadow-amber-200" });
    }
    if (stats.earlyLeaveDates?.includes(dateStr)) {
      events.push({ label: "Early", color: "bg-orange-400 text-white shadow-orange-200" });
    }

    days.push(
      <div key={d} className="min-h-[6rem] md:min-h-[8rem] border border-slate-100 rounded-2xl p-2 relative group hover:border-blue-200 transition-all bg-white flex flex-col justify-between">
        <span className={`text-sm font-bold block mb-1 ${holidayObj ? 'text-purple-600' : 'text-slate-700'}`}>{d}</span>
        <div className="flex flex-col gap-1 overflow-hidden">
          {events.map((ev, idx) => (
            <div key={idx} className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider truncate w-full shadow-sm ${ev.color}`} title={ev.label}>
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
        <div key={day} className="text-center text-[10px] font-black uppercase text-slate-300 tracking-widest py-2">{day}</div>
      ))}
      {days}
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function AttendanceStats({ targetEmployeeId }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const pad2 = (n) => String(n).padStart(2, "0");
  const filterLabel = useMemo(() => month === "All" ? `ALL ${year}` : `${pad2(month)}/${year}`, [month, year]);

  useEffect(() => {
    const fetchStats = async () => {
      // ถ้าไม่มี targetEmployeeId อาจจะ return หรือ fetch ของ current user (แล้วแต่ Logic)
      if (!targetEmployeeId) return; 

      try {
        setLoading(true);
        const data = await getAttendanceStats({
          year,
          month,
          employeeId: targetEmployeeId,
        });
        setStats({ ...data.stats, employeeName: data.employee?.name });
      } catch (err) {
        console.error("Fetch Stats Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [year, month, targetEmployeeId]);

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

  if (!targetEmployeeId) return null; // หรือ render empty state

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <Clock size={24} />
             </div>
             <div>
                 <h2 className="text-xl font-black text-slate-800">Attendance Statistics</h2>
                 <p className="text-sm text-slate-400 font-bold">Performance & History Overview</p>
             </div>
         </div>

        <div className="flex gap-2">
            <button
                onClick={() => setDatePickerOpen(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-sm transition-all"
            >
                <Filter size={16} className="text-slate-400" />
                {filterLabel}
            </button>
            
            <button
                onClick={() => { setYear(new Date().getFullYear()); setMonth("All"); }}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-widest"
            >
                Clear
            </button>
        </div>

        <DateGridPicker
            open={datePickerOpen}
            value={month === "All" ? `${year}` : `${year}-${pad2(month)}`}
            granularity="month"
            allowAll={true}
            title="Select Period"
            onClose={() => setDatePickerOpen(false)}
            onChange={(val) => {
            if (!val) { setMonth("All"); setYear(new Date().getFullYear()); return; }
            const s = String(val);
            if (/^\d{4}$/.test(s)) { setYear(Number(s)); setMonth("All"); return; }
            const m = s.match(/^(\d{4})-(\d{2})$/);
            if (m) { setYear(Number(m[1])); setMonth(Number(m[2])); }
            }}
        />
      </div>

      {loading && !stats ? (
        <div className="p-10 flex justify-center text-blue-600 font-bold animate-pulse">Loading Stats...</div>
      ) : stats ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard title="Working Days" value={`${stats.present}/${stats.totalDaysExpected}`} subValue="Present / Expected" icon={Briefcase} bgClass="bg-blue-50/50" colorClass="bg-blue-500" />
            <StatCard title="Late" value={stats.late} subValue={`${stats.lateMinutes || 0} mins`} icon={Clock} bgClass="bg-amber-50/50" colorClass="bg-amber-500" />
            <StatCard title="Early Leave" value={stats.earlyLeave} subValue={`${stats.earlyLeaveMinutes || 0} mins`} icon={Timer} bgClass="bg-orange-50/50" colorClass="bg-orange-500" />
            <StatCard title="Leaves" value={stats.leave} subValue="Approved" icon={CheckCircle2} bgClass="bg-emerald-50/50" colorClass="bg-emerald-500" />
            <StatCard title="Absences" value={stats.absent} subValue="Unexcused" icon={XCircle} bgClass="bg-rose-50/50" colorClass="bg-rose-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts */}
            <div className="lg:col-span-1 space-y-6">
               {/* Attendance Ratio */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-80 relative">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <PieChartIcon size={16} /> Ratio
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={attendanceRatioData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {attendanceRatioData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

               {/* Leave Types */}
              {leaveBreakdownData.length > 0 && (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-80 relative">
                  <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Filter size={16} /> Leave Types
                  </h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leaveBreakdownData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                          {leaveBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Calendar className="text-blue-500" size={20} />
                    {month === "All" ? "Yearly View" : `${new Date(0, month - 1).toLocaleString("en-US", { month: "long" })} Calendar`}
                  </h3>
                   {/* Legend */}
                   <div className="flex flex-wrap gap-2">
                      <LegendBadge color="bg-purple-500" text="Holiday" textColor="text-purple-600 bg-purple-50" />
                      <LegendBadge color="bg-rose-500" text="Absent" textColor="text-rose-600 bg-rose-50" />
                      <LegendBadge color="bg-amber-500" text="Late" textColor="text-amber-600 bg-amber-50" />
                      <LegendBadge color="bg-blue-500" text="Leave" textColor="text-blue-600 bg-blue-50" />
                   </div>
                </div>
                <AttendanceCalendar year={year} month={month} stats={stats} />
              </div>
            </div>
          </div>
        </div>
      ) : (
         <div className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-3xl">
            No attendance data found.
         </div>
      )}
    </div>
  );
}

const LegendBadge = ({ color, text, textColor }) => (
    <span className={`flex items-center gap-1 text-[9px] font-black uppercase ${textColor} px-2 py-1 rounded-lg`}>
        <div className={`w-2 h-2 rounded-full ${color}`}></div>{text}
    </span>
);