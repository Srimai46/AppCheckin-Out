import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon } from 'lucide-react'; // เปลี่ยนชื่อเพราะซ้ำกับ Date Object
import { createLeaveRequest } from '../api/leaveService'; // 👈 นำเข้า API

export default function LeaveRequest() {
  const navigate = useNavigate();
  
  // State สำหรับเก็บค่าในฟอร์ม
  const [selectedType, setSelectedType] = useState('');
  const [reason, setReason] = useState('');
  
  // 👇 เพิ่ม State สำหรับวันที่
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const leaveTypes = [
    { id: 'Sick', label: 'Sick Leave' },
    { id: 'Personal', label: 'Personal Leave' },
    { id: 'Paid', label: 'Paid Leave' },
    { id: 'Emergency', label: 'Emergency Leave' },
    { id: 'Other', label: 'Other' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validation: เช็คว่ากรอกครบไหม
    if (!selectedType) return alert("กรุณาเลือกประเภทการลา");
    if (!startDate || !endDate) return alert("กรุณาระบุวันที่เริ่มต้นและสิ้นสุด");
    if (new Date(startDate) > new Date(endDate)) return alert("วันที่สิ้นสุด ต้องมาทีหลังวันที่เริ่มต้น");

    if(confirm(`ยืนยันการส่งใบลาประเภท "${selectedType}" ใช่หรือไม่?`)) {
        setIsLoading(true);
        try {
            // 2. เตรียมข้อมูลส่ง Backend
            const payload = {
                type: selectedType,
                startDate: startDate, // ส่งไปเป็น string 'YYYY-MM-DD'
                endDate: endDate,
                reason: reason
            };

            // 3. ยิง API จริง
            await createLeaveRequest(payload);
            
            alert("✅ ส่งใบลาเรียบร้อยแล้ว!");
            navigate('/dashboard'); 

        } catch (error) {
            console.error(error);
            alert("❌ เกิดข้อผิดพลาด: " + (error.response?.data?.error || error.message));
        } finally {
            setIsLoading(false);
        }
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Leave request
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Select a leave type, date range, and provide a reason.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Left Column: Leave Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Leave Type <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 gap-3">
                {leaveTypes.map((type) => (
                  <div 
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`
                      relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${selectedType === type.id 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                      ${selectedType === type.id ? 'border-blue-600' : 'border-gray-400'}
                    `}>
                      {selectedType === type.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      )}
                    </div>
                    
                    <span className={`font-medium ${selectedType === type.id ? 'text-blue-900' : 'text-gray-700'}`}>
                      {type.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Date & Reason */}
            <div className="space-y-6">
              
              {/* 👇 ส่วนเลือกวันที่ (Date Picker) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <CalendarIcon size={18} />
                    </div>
                    <input 
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-700"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <CalendarIcon size={18} />
                    </div>
                    <input 
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-700"
                      value={endDate}
                      min={startDate} // บังคับว่าห้ามเลือกก่อนวันเริ่ม
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  placeholder="Enter leave reason details..."
                  rows="6"
                  className="w-full p-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none outline-none text-gray-700 bg-white"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
              disabled={isLoading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`
                px-8 py-2.5 rounded-lg bg-[#0088cc] text-white font-medium shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5
                ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#0077b3]'}
              `}
            >
              {isLoading ? 'Sending...' : 'Submit Request'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}