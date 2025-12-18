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
  const [selectedDate, setSelectedDate] = useState(new Date()); // ✅ เก็บวันที่ที่ถูกคลิก

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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

  // ✅ ฟังก์ชันเมื่อคลิกที่ช่องวันที่
  const handleDayClick = (day) => {
    const dayLeaves = leaves.filter(l => isSameDay(l.date, day));
    setSelectedDate(day);
    setModalLeaves(dayLeaves);
    setShowModal(true);
  };

  // ปุ่ม Show all today (ปรับมาใช้ handleDayClick)
  const handleShowTodayLeaves = () => {
    handleDayClick(new Date());
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
      case 'Annual': return 'bg-emerald-50 text-emerald-700 border-emerald-100'; // เปลี่ยนจาก Vacation ให้ตรงตาม DB
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate))
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls (เหมือนเดิม) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600 bg-gray-100 p-2 px-4 rounded-lg">
                <Home size={18} />
                <span className="font-semibold text-gray-800">Team Calendar</span>
            </div>
            <button 
                onClick={handleShowTodayLeaves}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
                <CalendarIcon size={16} />
                Today's Overview
            </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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

      {/* Grid */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
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
                <div 
                  key={day.toString()} 
                  onClick={() => handleDayClick(day)} // ✅ เพิ่มคลิกที่ช่องวันที่
                  className={`min-h-[120px] p-2 border-r border-b border-gray-50 relative cursor-pointer transition-all hover:bg-blue-50/30 group ${!isSameMonth(day, currentDate) ? 'bg-gray-50/30 opacity-50' : ''}`}
                >
                  <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg mb-2 transition-all ${isToday(day) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 group-hover:text-blue-600'}`}>
                    {format(day, 'd')}
                  </span>

                  <div className="space-y-1">
                    {dayLeaves.slice(0, 3).map((leaf) => ( // แสดงหน้าปฏิทินแค่ 3 รายการเพื่อไม่ให้ล้น
                      <div 
                        key={leaf.id} 
                        className={`text-[9px] px-2 py-0.5 rounded-md border flex items-center gap-1 truncate font-bold ${getEventStyle(leaf.type, leaf.status)}`}
                      >
                        <span className={`w-1 h-1 rounded-full shrink-0 ${getStatusColor(leaf.status)}`}></span>
                        <span className="truncate">{leaf.name}</span>
                      </div>
                    ))}
                    {dayLeaves.length > 3 && (
                      <div className="text-[8px] text-blue-500 font-black pl-1">+ {dayLeaves.length - 3} more...</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in duration-300">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-gray-900 text-2xl tracking-tight">Daily Details</h3>
                <p className="text-blue-600 text-sm font-black uppercase tracking-widest mt-1">
                  {format(selectedDate, 'dd MMMM yyyy')} {/* ✅ แสดงวันที่ที่เลือกจริง */}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-500 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-8 pt-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {modalLeaves.length > 0 ? (
                modalLeaves.map(leaf => (
                  <div key={leaf.id} className="flex justify-between items-center p-4 rounded-2xl border border-gray-50 bg-gray-50/30 shadow-sm hover:shadow-md transition-all">
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
                <div className="text-center py-10 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                    <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <CalendarIcon className="text-gray-300" size={32} />
                    </div>
                    <p className="font-bold text-gray-400">No leave requests for this date</p>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}