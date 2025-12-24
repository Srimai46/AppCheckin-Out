import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // ✅ "0.0.0.0" ทำให้เครื่องอื่นในวง LAN สามารถเข้าถึงหน้าเว็บผ่าน IP เครื่องคุณได้
    host: "0.0.0.0", 
    port: 5173,
    proxy: {
      // ✅ เปลี่ยนจาก IP ตรงๆ เป็น localhost:8080
      // เพราะคนรัน Vite มักจะรัน Backend ไว้ในเครื่องเดียวกัน
      "/api": {
        target: "http://localhost:8080", 
        changeOrigin: true,
      },

      // ✅ ไฟล์แนบก็ชี้ไปที่ localhost เช่นกัน
      "/uploads": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});