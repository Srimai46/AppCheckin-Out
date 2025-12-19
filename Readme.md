Backend Tool ที่ใช้ 

pnpm
NodeJS         		     | V20		
Express.js   		     | V4.18.2		
Prisma 			         | V5.15.0		
Prisma/Client 		     | V5.15.0		
Zod						
socket.io 		         | V4.8.1    	
bcrypt 		             | V6.0.0          	
JWTtolken 	             | V9.0.2     	
node-cron					

pnpm add express@4.18.2
pnpm add cors morgan dotenv
pnpm add @prisma/client@5.15.0
pnpm add mysql2
pnpm add -D prisma@5.15.0  # CLI สำหรับ migrate/generate
pnpm add zod
pnpm add socket.io@4.8.1
pnpm add bcrypt@6.0.0
pnpm add jsonwebtoken@9.0.2
pnpm add node-cron
pnpm add -D nodemon
pnpm install bcryptjs


Git Clone

pnpm install
* Edit .env *
pnpm prisma migrate dev
pnpm prisma generate

** Clear Data in Database **
node prisma/clear.js
pnpm seed


Frontend Tool

React 			             | V18.2.0^			
React DOM 		             | V18.2.0^		
React Router DOM 	         | V6.22.0^		 
React Query (TanStack Query) | V5.x		
React Hook Form		         | V7.x		
Vite 			             | V5^		
Axios			             | V1.13.2 		
Zod			                 | 			
socket.io-client	         | V4.8.1		
Day.js                       			
react-toastify		         | V9.x		
FullCalendar		         | V6.x		
CSS ? 
{ อาจจะมีเพิ่ม }

pnpm create vite frontend
pnpm add react@18.2.0 react-dom@18.2.0
pnpm add react-router-dom@6.22.0
pnpm add @tanstack/react-query@5
pnpm add react-hook-form@7
pnpm add zod
pnpm add -D vite@5
pnpm add axios@1.13.2
pnpm add socket.io-client@4.8.1
pnpm add dayjs
pnpm add react-toastify@9
pnpm add @fullcalendar/react@6 @fullcalendar/daygrid@6


Folder 
project-root/
backend/
│   ├── prisma/
│   │   ├── migrations/          # Folder ที่ Prisma สร้างให้อัตโนมัติ
│   │   ├── schema.prisma        # Database Schema (Model หลักอยู่ที่นี่)
│   │   └── seed.js              # Script สำหรับลงข้อมูลตัวอย่าง
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── prisma.js        # Config Prisma Client Instance
│   │   │
│   │   ├── controllers/         # Logic การทำงานหลัก
│   │   │   ├── authController.js         # Login, GetMe
│   │   │   ├── leaveController.js        # ขอลา, อนุมัติ, แจ้งเตือน
│   │   │   ├── notificationController.js # ดึงแจ้งเตือน, กดอ่าน
│   │   │   └── timeRecordController.js   # เข้างาน/ออกงาน, เช็คสาย
│   │   │
│   │   ├── routes/              # เส้นทาง API
│   │   │   ├── authRoutes.js
│   │   │   ├── leaveRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   └── timeRecordRoutes.js
│   │   │
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js # ตรวจสอบ Token (Protect Route)
│   │   │
│   │   ├── utils/
│   │   │   └── generateToken.js  # ฟังก์ชันสร้าง JWT
│   │   │
│   │   ├── sockets/
│   │   │   └── socketHandler.js  # จัดการ Connection ของ Socket.io
│   │   │
│   │   ├── jobs/
│   │   │   └── attendanceJob.js  # Cron Job ตรวจคนมาสาย/ขาดงาน
│   │   │
│   │   └── app.js                # Express Setup (รวม Routes)
│   │
│   ├── .env                      # Config DB, Port, Secret
│   ├── package.json
│   └── server.js                 # Entry Point (HTTP Server + Socket Init)
│
├── frontend/
│   ├── src/
│   │   ├── assets/              # รูปภาพ, CSS, icons
│   │   ├── components/          # UI component เช่น Button, Modal, Form
│   │   ├── pages/               # หน้า Login, Dashboard, LeaveForm
│   │   ├── hooks/               # custom hook เช่น useAuth, useLeave
│   │   ├── context/             # global state เช่น AuthContext
│   │   ├── router/              # React Router config
│   │   ├── api/                 # axios instance + service call
│   │   ├── utils/               # ฟังก์ชันช่วย เช่น formatDate, quotaCalc
│   │   ├── styles/              # global CSS หรือ Tailwind config
│   │   └── main.jsx             # Entry point
│   └── index.html               # Template HTML
│
├── .env                         # Environment variables
├── package.json                 # Dependency ทั้ง backend + frontend
└── README.md                    # คู่มือโปรเจกต์

Git Clone 

pnpm install 

** Login **
hr@company.com
password123