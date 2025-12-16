// frontend/src/App.jsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './router/AppRouter';

function App() {
  return (
    <BrowserRouter>
      {/* ใส่ AuthProvider ไว้ตรงนี้ เพื่อให้ทุกหน้าเข้าถึง user ได้ */}
      <AuthProvider>
        {/* เรียกใช้ Router ที่เราเขียน Logic ไว้แล้ว */}
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;