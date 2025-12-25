import React from "react";

export default function QuotaCards({ quotas }) {
  // ✅ 1. เพิ่มการตรวจสอบว่าเป็น Array หรือไม่ เพื่อป้องกัน Error .map is not a function
  if (!quotas || !Array.isArray(quotas) || quotas.length === 0) {
    return (
      <div className="w-full p-10 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          No leave quota data found for this period
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {quotas.map((q, idx) => {
        // ✅ 2. ป้องกันค่า NaN โดยใช้ค่าเริ่มต้นเป็น 0
        const total = parseFloat(q.total) || 0;
        const used = parseFloat(q.used) || 0;
        const carryOver = parseFloat(q.carryOver) || 0;
        const baseQuota = parseFloat(q.baseQuota) || 0;
        const remaining = parseFloat(q.remaining) || 0;
        
        // คำนวณเปอร์เซ็นต์สำหรับ Progress Bar
        const percent = total > 0 ? (used / total) * 100 : 0;

        return (
          <div
            key={idx}
            className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-md transition-all animate-in fade-in"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                {q.type}
              </div>
              
              {/* ✅ แสดง Badge แจ้งยอดทบสะสมจากปีก่อน */}
              {carryOver > 0 && (
                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 animate-pulse">
                  +{carryOver} CARRY OVER
                </span>
              )}
            </div>

            <div className="text-3xl font-black text-slate-800 tracking-tighter">
              {remaining}{" "}
              <span className="text-xs font-normal text-gray-400 uppercase">
                Days
              </span>
            </div>

            <div className="text-[10px] text-gray-400 mt-1 font-black uppercase tracking-tighter">
              Used {used} / Total {total} 
              {/* ✅ แสดงรายละเอียดที่มาของตัวเลข (โควตาหลัก + ยอดทบ) */}
              {carryOver > 0 && (
                <span className="lowercase text-blue-400 ml-1 font-bold">
                  ({baseQuota} base + {carryOver} carried)
                </span>
              )}
            </div>

            {/* Progress Bar แสดงสัดส่วนการใช้วันลา */}
            <div className="mt-4 w-full bg-gray-50 h-1.5 rounded-full overflow-hidden border border-gray-50">
              <div
                className={`h-full transition-all duration-700 ${
                  percent >= 100 ? "bg-rose-500" : "bg-blue-600"
                }`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}