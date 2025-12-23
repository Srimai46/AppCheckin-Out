import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // ✅ API ไป Backend
      "/api": {
        target: "http://192.168.1.35:8080",
        changeOrigin: true,
      },

      // ✅ ไฟล์แนบ (สำคัญมาก)
      "/uploads": {
        target: "http://192.168.1.35:8080",
        changeOrigin: true,
      },
    },
  },
});
