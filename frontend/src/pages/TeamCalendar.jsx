import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, 
  subMonths, isToday, setMonth, setYear, getYear
} from 'date-fns';
import { ChevronLeft, ChevronRight, Home, X, CheckCircle2, XCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { getAllLeaves } from '../api/leaveService';

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalLeaves, setModalLeaves] = useState([]);

  // ข้อมูลสำหรับ Dropdown เลือกเดือน/ปี
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = getYear(new Date());
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const data = await getAllLeaves();
        const formattedLeaves = data.map(item => ({
          id: item.id,
          name: item.name, 
          type: item.type,
          status: item.status,
          date: new Date(item.startDate)
        }));
        setLeaves(formattedLeaves);
      } catch (error) {
        console.error("Error fetching leaves:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, []);

  // ✅ ฟังก์ชันปุ่ม Show all leaves today
  const handleShowTodayLeaves = () => {
    const todayLeaves = leaves.filter(l => isSameDay(l.date, new Date()));
    setModalLeaves(todayLeaves);
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-500';
      case 'Rejected': return 'bg-rose-500';
      default: return 'bg-amber-500';
    }
  };

  const getEventStyle = (type, status) => {
    if (status === 'Rejected') return 'opacity-50 line-through bg-gray-100 text-gray-400 border-gray-200';
    switch (type) {
      case 'Sick': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Personal': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Vacation': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate))
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600 bg-gray-100 p-2 px-4 rounded-lg">
                <Home size={18} />
                <span className="font-semibold text-gray-800">Team Calendar</span>
            </div>
            {/* ✅ ปุ่ม Show all today ที่ทำงานจริง */}
            <button 
                onClick={handleShowTodayLeaves}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
                <CalendarIcon size={16} />
                Today's Leaves ({leaves.filter(l => isSameDay(l.date, new Date())).length})
            </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* ✅ ส่วนเลือกเดือนแบบละเอียด (Detailed Month/Year Picker) */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <select 
                value={currentDate.getMonth()}
                onChange={(e) => setCurrentDate(setMonth(currentDate, parseInt(e.target.value)))}
                className="bg-transparent text-sm font-bold text-gray-700 px-3 py-1.5 outline-none cursor-pointer hover:text-blue-600"
            >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <div className="w-[1px] h-4 bg-gray-200"></div>
            <select 
                value={currentDate.getFullYear()}
                onChange={(e) => setCurrentDate(setYear(currentDate, parseInt(e.target.value)))}
                className="bg-transparent text-sm font-bold text-gray-700 px-3 py-1.5 outline-none cursor-pointer hover:text-blue-600"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>


        </div>
      </div>

      {/* Legend & Grid */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-end mb-4 gap-4 text-[10px] font-black text-gray-400 uppercase">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Rejected</div>
        </div>

        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-inner bg-gray-50/20">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 bg-white">
            {calendarDays.map((day) => {
              const dayLeaves = leaves.filter(leaf => isSameDay(leaf.date, day));
              return (
                <div key={day.toString()} className={`min-h-[130px] p-2 border-r border-b border-gray-50 relative transition-all hover:z-10 hover:shadow-xl hover:shadow-gray-200/50 hover:bg-white ${!isSameMonth(day, currentDate) ? 'bg-gray-50/30' : ''}`}>
                  <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg mb-2 ${isToday(day) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>

                  <div className="space-y-1">
                    {dayLeaves.map((leaf) => (
                      <div 
                        key={leaf.id} 
                        className={`text-[9px] px-2 py-1 rounded-lg border flex items-center gap-1.5 truncate font-bold ${getEventStyle(leaf.type, leaf.status)}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusColor(leaf.status)}`}></span>
                        <span className="truncate">{leaf.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Popup (UX/UI คลีนที่สุด) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in duration-300">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-gray-900 text-2xl tracking-tight">Daily Overview</h3>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">{format(new Date(), 'dd MMMM yyyy')}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-8 pt-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {modalLeaves.length > 0 ? (
                modalLeaves.map(leaf => (
                  <div key={leaf.id} className="flex justify-between items-center p-4 rounded-2xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <div className="font-black text-gray-800 text-base">{leaf.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter mt-0.5">{leaf.type} Leave</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {leaf.status === 'Approved' && <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"><CheckCircle2 size={10}/> APPROVED</span>}
                        {leaf.status === 'Rejected' && <span className="flex items-center gap-1 text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100"><XCircle size={10}/> REJECTED</span>}
                        {leaf.status === 'Pending' && <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100"><Clock size={10}/> PENDING</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                    <div className="bg-gray-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="text-gray-300" size={32} />
                    </div>
                    <p className="font-bold text-gray-400">No leaves today</p>
                </div>
              )}
            </div>
            
            <div className="p-8 pt-0 flex justify-center">
              <button onClick={() => setShowModal(false)} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl text-sm transition hover:bg-black hover:shadow-2xl hover:shadow-gray-400">GOT IT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}