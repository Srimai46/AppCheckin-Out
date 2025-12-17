import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, User, X, Users, UserMinus, Loader2 } from "lucide-react";

export default function EmployeeList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // "active" | "inactive"
  
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "",
    role: "Worker", joiningDate: ""
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("http://192.168.1.42:8080/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // ตรวจสอบข้อมูลผ่าน Console
      console.log("Employees Data:", res.data);
      setEmployees(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ✅ แก้ไข Logic การกรองข้อมูลให้แม่นยำขึ้น
  const filteredEmployees = employees.filter(emp => {
    // รองรับกรณีค่ามาจาก DB เป็น 1/0 หรือ true/false
    const isEmpActive = emp.isActive === true || emp.isActive === 1;
    return activeTab === "active" ? isEmpActive : !isEmpActive;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://192.168.1.42:8080/api/employees", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("เพิ่มพนักงานสำเร็จ!");
      setShowModal(false);
      fetchEmployees(); 
      setFormData({ firstName: "", lastName: "", email: "", password: "", role: "Worker", joiningDate: "" });
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <User className="text-blue-600" /> Employee Directory
        </h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 font-bold text-sm"
        >
          <Plus size={20} /> Add New Employee
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
        <button 
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "active" ? "bg-white text-blue-600 shadow-md" : "text-gray-400 hover:text-gray-600"}`}
        >
          <Users size={18} /> Active ({employees.filter(e => e.isActive === true || e.isActive === 1).length})
        </button>
        <button 
          onClick={() => setActiveTab("inactive")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "inactive" ? "bg-white text-rose-600 shadow-md" : "text-gray-400 hover:text-gray-600"}`}
        >
          <UserMinus size={18} /> Resigned ({employees.filter(e => e.isActive === false || e.isActive === 0).length})
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="p-6">ID</th>
              <th className="p-6">Employee Name</th>
              <th className="p-6">Email Address</th>
              <th className="p-6 text-center">Role</th>
              <th className="p-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" />
                  <span className="font-bold text-gray-400">Loading directory...</span>
                </td>
              </tr>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <tr 
                  key={emp.id} 
                  onClick={() => navigate(`/employees/${emp.id}`)} 
                  className="hover:bg-blue-50/30 cursor-pointer transition-all group"
                >
                  <td className="p-6 text-gray-400 font-bold text-sm">#{emp.id}</td>
                  <td className="p-6 font-black text-slate-800">{emp.firstName} {emp.lastName}</td>
                  <td className="p-6 text-gray-500 text-sm font-medium italic">{emp.email}</td>
                  <td className="p-6 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${emp.role === 'HR' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-6">
                     <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${emp.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${emp.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {emp.isActive ? "Working" : "Resigned"}
                        </span>
                     </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs">
                  No employees found in this category
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Section */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 relative animate-in zoom-in duration-300 shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-gray-300 hover:text-rose-500 transition-colors"><X size={24} /></button>
            <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">Add New Employee</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">First Name</label>
                  <input required className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Last Name</label>
                  <input required className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Address</label>
                  <input required type="email" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Password</label>
                  <input required type="password" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Role</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="Worker">Worker</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Joining Date</label>
                  <input required type="date" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm shadow-xl shadow-blue-200 mt-6 hover:bg-blue-700 transition-all active:scale-[0.98]">REGISTER EMPLOYEE</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}