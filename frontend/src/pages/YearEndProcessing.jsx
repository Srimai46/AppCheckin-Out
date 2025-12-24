import React, { useState, useEffect } from "react";
import {
  getSystemConfigs,
  processCarryOver,
  reopenYear,
} from "../api/leaveService";
import {
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  Info,
  Save,
} from "lucide-react";

const YearEndProcessing = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);

  // เพิ่ม State สำหรับกำหนดโควตาที่จะแจกพร้อมการทบยอด
  const [quotas, setQuotas] = useState({
    ANNUAL: 6,
    SICK: 30,
    PERSONAL: 6,
    EMERGENCY: 5,
  });

  const fetchConfigs = async () => {
    try {
      const data = await getSystemConfigs();
      setConfigs(data);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleQuotaChange = (type, value) => {
    setQuotas((prev) => ({ ...prev, [type]: Number(value) }));
  };

  const handleProcess = async () => {
    const lastYear = Number(targetYear) - 1;

    const confirmMessage =
      `⚠️ ยืนยันการประมวลผลประจำปี?\n\n` +
      `1. ระบบจะทบยอดวันลา Annual จากปี ${lastYear} (สูงสุด 12 วัน)\n` +
      `2. แจกโควตาใหม่ปี ${targetYear}: พักร้อน ${quotas.ANNUAL} วัน, ลาป่วย ${quotas.SICK} วัน ฯลฯ\n` +
      `3. ข้อมูลปี ${lastYear} จะถูก "ล็อค" ทันที\n\n` +
      `คุณต้องการดำเนินการต่อใช่หรือไม่?`;

    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      // ✅ มั่นใจว่าส่ง Object ที่มี key targetYear และ quotas
      const res = await processCarryOver({
        targetYear: Number(targetYear),
        quotas: quotas,
      });
      alert(res.message || "ประมวลผลและแจกโควตาสำเร็จ!");
      await fetchConfigs();
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "เกิดข้อผิดพลาดในการประมวลผล";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async (year) => {
    if (!window.confirm(`ต้องการปลดล็อคปี ${year} ใช่หรือไม่?`)) return;
    try {
      await reopenYear(year);
      alert(`ปลดล็อคปี ${year} เรียบร้อยแล้ว`);
      fetchConfigs();
    } catch (error) {
      alert(
        "ไม่สามารถปลดล็อคได้: " +
          (error.response?.data?.error || "Unknown error")
      );
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-indigo-600" />{" "}
            ระบบปิดงวดและแจกโควตาประจำปี
          </h1>
          <p className="text-gray-500">
            ทบวันลาสะสมและเริ่มโควตาใหม่ในปุ่มเดียว
          </p>
        </header>

        {/* ส่วนประมวลผลและตั้งค่าโควตา */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <Info size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                ตั้งค่าโควตาสำหรับปี {targetYear}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                ระบุจำนวนวันลาพื้นฐานที่จะแจกให้พนักงานทุกคนพร้อมกับการทบยอด
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.keys(quotas).map((type) => (
                  <div key={type}>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-1">
                      {type}
                    </label>
                    <input
                      type="number"
                      value={quotas[type]}
                      onChange={(e) => handleQuotaChange(type, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-bold mb-1">
                    เลือกปีเป้าหมาย
                  </span>
                  <select
                    className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-sm font-bold outline-none"
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                  >
                    <option value={2025}>ปี 2025</option>
                    <option value={2026}>ปี 2026</option>
                    <option value={2027}>ปี 2027</option>
                  </select>
                </div>

                <button
                  onClick={handleProcess}
                  disabled={loading}
                  className="mt-5 bg-indigo-600 text-white px-8 py-2.5 rounded-xl hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {loading ? "กำลังประมวลผล..." : "ยืนยันปิดงวดและแจกโควตา"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ตารางประวัติ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
              ประวัติการดำเนินการ
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">ปี (Year)</th>
                  <th className="px-6 py-4">สถานะการล็อค</th>
                  <th className="px-6 py-4 text-center">ดำเนินการเมื่อ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.length > 0 ? (
                  configs.map((config) => (
                    <tr
                      key={config.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-gray-700">
                        {config.year}
                      </td>
                      <td className="px-6 py-4">
                        {config.isClosed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase">
                            <Lock size={12} /> Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase">
                            <Unlock size={12} /> Open
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 text-xs font-medium">
                        {config.closedAt
                          ? new Date(config.closedAt).toLocaleString("th-TH")
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {config.isClosed && (
                          <button
                            onClick={() => handleReopen(config.year)}
                            className="text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-lg transition-all text-[11px] font-black uppercase tracking-tighter border border-orange-100"
                          >
                            ปลดล็อคปีนี้
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-10 text-center text-gray-400 italic text-sm"
                    >
                      ยังไม่มีประวัติการดำเนินการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 text-amber-700 bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <AlertTriangle size={20} className="shrink-0" />
          <div className="text-xs font-bold leading-relaxed uppercase tracking-tight">
            คำเตือน: การกดปุ่มนี้จะทำการ "เขียนทับ"
            โควตาของพนักงานทุกคนในปีเป้าหมาย และล็อคข้อมูลปีที่แล้วทันที
            โปรดตรวจสอบจำนวนวันลาที่จะแจกให้ถูกต้อง
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearEndProcessing;
