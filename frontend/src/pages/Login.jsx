import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Loader2 } from 'lucide-react'; // เพิ่ม Loader2

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); // เพิ่ม state เก็บ error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(''); // เคลียร์ error เก่าก่อน

    console.log("🚀 กำลัง Login...");
    console.log(`📡 Email: ${email}`);

    try {
      await login(email, password);
      console.log("✅ Login successful. Redirecting...");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("❌ Login Error:", error);

      let msg = "An unexpected error occurred.";

      if (error.code === "ERR_NETWORK") {
        msg = "Unable to connect to the server. Please ensure that the backend service is running.";
      } else if (error.response?.data?.error) {
        // Error message returned from backend (e.g., "Invalid email or password")
        msg = error.response.data.error;
      } else if (error.message) {
        msg = error.message;
      }

      setErrorMsg(msg); // Display error on the screen instead of using alert
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50">
      <div className="w-full max-w-md p-10 bg-white rounded-2xl shadow-xl border border-blue-100">
        
        {/* Header */}
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-900">Welcome Back!</h2>
            <p className="text-gray-500 mt-2">ลงชื่อเข้าใช้ระบบลงเวลาพนักงาน</p>
        </div>

        {/* Error Message Box */}
        {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
                {errorMsg}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                placeholder="ชื่อผู้ใช้งาน (Email)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                placeholder="รหัสผ่าน"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold shadow-md 
                hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all 
                flex justify-center items-center gap-2
                ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
          >
            {isLoading ? (
                <>
                    <Loader2 className="animate-spin h-5 w-5" /> Authenticating...
                </>
            ) : (
                'Login'
            )}
          </button>
        </form>

        {/* Test Accounts Hint (Optional: ลบออกได้ถ้าใช้งานจริง) */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          <p className="font-semibold mb-2">บัญชีทดสอบ:</p>
          <div className="space-y-1">
            <p>HR : <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">hr@company.com</span></p>
            <p>Worker : <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">somchai@company.com</span></p>
            <p>Pass : <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">123456</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}