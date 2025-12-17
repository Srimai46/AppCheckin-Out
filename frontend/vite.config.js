import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // ✅ เปิดให้เครื่องอื่นใน LAN เข้าได้
    port: 5173,
    proxy: {
      '/api': '192.168.1.42:5173' // ✅ IP ของเครื่องที่รัน Backend
    }
  }
});
