# 🕒 HR & Attendance Management System

ระบบจัดการทรัพยากรบุคคลและบันทึกเวลาทำงาน (Time Attendance) แบบครบวงจร พัฒนาด้วย Modern Web Stack ที่เน้นความรวดเร็วและ Real-time

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Node Version](https://img.shields.io/badge/Node.js-v20-green)
![React Version](https://img.shields.io/badge/React-v18-blue)

---

## 🛠️ Tech Stack

โปรเจกต์นี้แยกส่วนการทำงานเป็น Backend และ Frontend โดยใช้เทคโนโลยีดังนี้:

### 🔙 Backend
| Technology | Version | Description |
| :--- | :--- | :--- |
| **Node.js** | `v20` | Runtime Environment |
| **Express.js** | `v4.18.2` | Web Framework |
| **Prisma ORM** | `v5.15.0` | Database ORM |
| **MySQL** | `v8` | Database |
| **Socket.io** | `v4.8.1` | Real-time Communication |
| **JWT & Bcrypt** | `v9.0.2` / `v6.0.0` | Authentication & Security |
| **Node-Cron** | `Latest` | Scheduled Jobs |
| **Zod** | `Latest` | Schema Validation |

### 🎨 Frontend
| Technology | Version | Description |
| :--- | :--- | :--- |
| **React** | `v18.2.0` | UI Library |
| **Vite** | `v5.x` | Build Tool (Fast & Light) |
| **Tailwind CSS** | `Latest` | Utility-first CSS Framework |
| **TanStack Query** | `v5.x` | Data Fetching & State Management |
| **React Hook Form** | `v7.x` | Form Handling |
| **FullCalendar** | `v6.x` | Calendar Interface |
| **Axios** | `v1.13.2` | HTTP Client |
| **SweetAlert2** | `Latest` | Beautiful Popups |

---

## ⚙️ Installation & Setup

ทำตามขั้นตอนด้านล่างเพื่อเริ่มใช้งานโปรเจกต์ในเครื่องของคุณ

### 1. Prerequisites
ตรวจสอบว่าเครื่องของคุณได้ติดตั้งสิ่งเหล่านี้แล้ว:
* [Node.js](https://nodejs.org/) (v20+)
* [pnpm](https://pnpm.io/) (Package Manager)
* MySQL Database

### 2. Clone Repository
```bash
git clone <your-repo-url>
cd CheckIn-Out


-- Backend Setup --
cd backend

# Install dependencies
pnpm install

# Setup Environment Variables
# (สร้างไฟล์ .env และใส่ค่า Database URL)
cp .env.example .env 

# Database Migration & Generate Client
pnpm prisma migrate dev
pnpm prisma generate

# Seed Initial Data (ข้อมูลตัวอย่าง & Admin)
node prisma/clear.js
pnpm seed


-- Frontend Setup -- 
# Start Server
pnpm dev

cd frontend

# Install dependencies
pnpm install

# Start Frontend
pnpm run dev


-- Project Structure -- 
project-root/
│
├── 📂 backend/
│   ├── 📂 prisma/
│   │   ├── 📂 migrations/      # Migration history
│   │   ├── schema.prisma       # Database Schema Definition
│   │   ├── clear.js            # Script ล้างข้อมูล
│   │   └── seed.js             # Script ลงข้อมูลเริ่มต้น
│   │
│   ├── 📂 src/
│   │   ├── 📂 config/          # Database & Prisma Config
│   │   ├── 📂 controllers/     # Business Logic (Auth, Leave, Attendance)
│   │   ├── 📂 middlewares/     # Auth & Error Handling
│   │   ├── 📂 routes/          # API Endpoints definition
│   │   ├── 📂 utils/           # Helpers (Token, Date format)
│   │   ├── 📂 sockets/         # Real-time Logic
│   │   ├── 📂 jobs/            # Cron Jobs (Check Late/Absent)
│   │   ├── app.js              # App Configuration
│   │   └── server.js           # Entry Point
│   │
│   └── .env                    # Environment Variables
│
└── 📂 frontend/
    ├── 📂 src/
    │   ├── 📂 api/             # API Service Calls (Axios)
    │   ├── 📂 assets/          # Images & Icons
    │   ├── 📂 components/      # Reusable UI Components
    │   ├── 📂 context/         # Global State (AuthContext)
    │   ├── 📂 pages/           # Application Pages (Dashboard, Login)
    │   ├── 📂 router/          # Route Definitions
    │   ├── 📂 styles/          # CSS / Tailwind
    │   └── 📂 utils/           # Frontend Helpers
    │
    ├── index.html
    └── vite.config.js