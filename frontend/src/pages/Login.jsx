import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // 1. เพิ่ม state สำหรับเช็คว่ากำลังโหลดอยู่ไหม
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 2. Log เพื่อดูว่าฟังก์ชันเริ่มทำงานไหม
    console.log("🚀 กดปุ่ม Login แล้ว...");
    console.log(`📡 กำลังยิงไปที่: ${email}`);

    setIsLoading(true); // เริ่มโหลด (ปุ่มจะจางลง)

    try {
      await login(email, password);
      console.log("✅ Login สำเร็จ! กำลังย้ายหน้า...");
      navigate('/'); 
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาด:", error); // ดู Error เต็มๆ ใน Console
      
      // เช็คว่า Error เกิดจากอะไรแน่
      let msg = "Unknown Error";
      if (error.code === "ERR_NETWORK") {
        msg = "เชื่อมต่อ Server ไม่ได้ (เช็ค IP / Firewall / Server Run อยู่ไหม?)";
      } else if (error.response) {
        msg = error.response.data.error || "รหัสผ่านผิด";
      } else {
        msg = error.message;
      }
      
      alert('Login Failed: ' + msg);
    } finally {
      setIsLoading(false); // โหลดเสร็จแล้ว (ไม่ว่าจะผ่านหรือไม่ผ่าน)
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-200">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">เข้าสู่ระบบ</h2>
        <input 
          type="email" 
          placeholder="Email" 
          className="w-full p-3 border rounded mb-4"
          value={email} onChange={e => setEmail(e.target.value)} required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="w-full p-3 border rounded mb-6"
          value={password} onChange={e => setPassword(e.target.value)} required 
        />
        
        {/* 3. ปรับปุ่มให้แสดงสถานะ Loading */}
        <button 
          type="submit" 
          disabled={isLoading} // ห้ามกดซ้ำตอนกำลังโหลด
          className={`w-full py-3 rounded text-white font-bold transition
            ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
          `}
        >
          {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
        </button>
      </form>
    </div>
  );
}