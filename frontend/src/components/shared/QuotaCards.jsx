export default function QuotaCards({ quotas }) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {quotas.map((q, idx) => {
        const isSpecial =
          typeof q.type === "string" && q.type.toLowerCase() === "special";

        const total = Number(q.total) || 0;
        const used = Number(q.used) || 0;
        const carryOver = Number(q.carryOver) || 0;
        const baseQuota = Number(q.baseQuota) || 0;
        const remaining = Number(q.remaining) || 0;

        const percent = total > 0 ? (used / total) * 100 : 0;

        return (
          <div
            key={idx}
            className={[
              "bg-white p-6 rounded-[2.5rem] shadow-sm border hover:shadow-md transition-all",
              isSpecial
                ? "border-rose-200 ring-1 ring-rose-100"
                : "border-gray-100",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div
                className={[
                  "text-[10px] font-black uppercase tracking-widest",
                  isSpecial ? "text-rose-300" : "text-gray-300",
                ].join(" ")}
              >
                {q.type}
              </div>

              {!isSpecial && carryOver > 0 && (
                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                  +{carryOver} CARRY OVER
                </span>
              )}
            </div>

            {/* ===== CONTENT ===== */}
            {isSpecial ? (
              <>
                {/* ✅ SPECIAL → แสดงเฉพาะ USED */}
                <div className="text-4xl font-black tracking-tighter text-slate-900">
                  {used}
                  <span className="ml-1 text-[10px] font-black text-rose-400 uppercase tracking-widest">
                    Used
                  </span>
                </div>

                <div className="text-[10px] mt-1 font-black text-rose-400 uppercase tracking-widest">
                  Special Leave Usage
                </div>

                <div className="mt-4 w-full bg-rose-50 h-1.5 rounded-full overflow-hidden border border-rose-100">
                  <div className="h-full bg-rose-300 w-full" />
                </div>
              </>
            ) : (
              <>
                {/* Leave ปกติ */}
                <div className="text-3xl font-black text-slate-800 tracking-tighter">
                  {remaining}
                  <span className="text-xs font-normal text-gray-400 uppercase ml-1">
                    Days
                  </span>
                </div>

                <div className="text-[10px] text-gray-400 mt-1 font-black uppercase tracking-tighter">
                  Used {used} / Total {total}
                  {carryOver > 0 && (
                    <span className="lowercase text-blue-400 ml-1 font-bold">
                      ({baseQuota} base + {carryOver} carried)
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-4 w-full bg-gray-50 h-1.5 rounded-full overflow-hidden border border-gray-50">
                  <div
                    className={`h-full transition-all duration-700 ${
                      percent >= 100 ? "bg-rose-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
