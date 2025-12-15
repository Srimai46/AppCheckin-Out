// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* เพิ่ม route อื่น ๆ ได้ตามต้องการ */}
      </Routes>
    </Router>
  );
}

export default App;
