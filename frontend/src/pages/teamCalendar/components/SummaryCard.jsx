export default function SummaryCard({ title, value, icon }) {
  return (
    <div className="bg-white p-5 rounded-[1.75rem] shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</div>
        <div className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{value}</div>
      </div>
      <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}
