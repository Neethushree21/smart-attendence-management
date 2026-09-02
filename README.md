# 🎓 Automated Student Attendance Monitoring & Analytics System

A complete full-stack web application for managing college student attendance using QR codes, JWT authentication, and real-time analytics.

---

## 📁 Project Structure

```
smartattendencemanagement/
├── backend/
│   ├── config/          # DB connection
│   ├── controllers/     # Business logic
│   ├── middleware/       # JWT auth, validation
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── utils/           # Seed script
│   ├── .env             # Environment variables
│   ├── package.json
│   └── server.js        # Entry point
└── frontend/
    ├── css/style.css    # Global dark theme CSS
    ├── js/
    │   ├── api.js       # Shared API utility + JWT
    │   ├── auth.js      # Login/Register logic
    │   ├── student.js   # Student dashboard logic
    │   ├── teacher.js   # Teacher dashboard logic
    │   └── admin.js     # Admin dashboard logic
    ├── index.html       # Login/Register page
    ├── student.html     # Student dashboard
    ├── teacher.html     # Teacher dashboard
    └── admin.html       # Admin dashboard
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v16+  
- [MongoDB](https://www.mongodb.com/try/download/community) (local) or MongoDB Atlas URI

---

## 🚀 Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

The `.env` file is already created in `backend/`. Edit it if needed:

```env
MONGO_URI=mongodb://localhost:27017/attendance_db
JWT_SECRET=SmActAttendanceSystem@SecretKey2024!
PORT=5000
JWT_EXPIRE=7d
QR_EXPIRY_MINUTES=5
```

### 3. Start MongoDB

Make sure MongoDB is running locally:
```bash
# Windows: start MongoDB service or run:
mongod
```

### 4. Seed Sample Data (Recommended)

```bash
cd backend
node utils/seedData.js
```

This creates:
- 1 Admin account
- 2 Teacher accounts  
- 5 Student accounts
- 3 Classes (CS301, CS302, MATH301)

### 5. Start the Backend Server

```bash
cd backend
node server.js
# or for auto-reload:
npm run dev
```

Server starts at: **http://localhost:5000**

### 6. Open the Frontend

Simply open in browser:
```
http://localhost:5000
```
> The backend serves the `frontend/` folder as static files automatically.

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| 🔴 Admin | admin@attendance.com | admin123 |
| 👩‍🏫 Teacher | rajesh@college.edu | teacher123 |
| 👩‍🏫 Teacher | anitha@college.edu | teacher123 |
| 🧑‍🎓 Student | arjun@student.edu | student123 |
| 🧑‍🎓 Student | priya@student.edu | student123 |
| 🧑‍🎓 Student | ravi@student.edu | student123 |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/me` | ✅ | Get current user |

### Student
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/student/dashboard` | Student | Dashboard stats |
| GET | `/api/student/attendance/:classId` | Student | Attendance history |

### Teacher
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/teacher/classes` | Teacher | Create class |
| GET | `/api/teacher/classes` | Teacher | List classes |
| POST | `/api/teacher/classes/:id/students` | Teacher | Enroll students |
| GET | `/api/teacher/sessions` | Teacher | List sessions |
| GET | `/api/teacher/attendance/:classId` | Teacher | View attendance |
| GET | `/api/teacher/attendance/:classId?download=csv` | Teacher | Download CSV |

### QR
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/qr/generate` | Teacher | Generate QR session |
| POST | `/api/qr/verify` | ❌ | Verify QR token |

### Attendance
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/attendance/mark` | Student | Mark attendance via QR |
| GET | `/api/attendance/:studentId` | Any | Get student records |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | System statistics |
| GET | `/api/admin/users?role=student` | Admin | List users |
| GET | `/api/admin/classes` | Admin | List all classes |
| GET | `/api/admin/low-attendance?threshold=75` | Admin | Low attendance list |
| PUT | `/api/admin/users/:id/toggle` | Admin | Toggle user status |

---

## 🔄 Attendance Flow

```
Teacher → Start Session → Backend creates QRSession (UUID token, 5 min expiry)
       → QR Code (base64 PNG) returned to teacher → Displayed on screen

Student → Scan QR (camera via html5-qrcode) → Token extracted
       → POST /api/attendance/mark { qrToken }
       → Backend: validates token → checks expiry → checks enrollment → prevents duplicate
       → Attendance marked ✅
```

---

## 🔒 Security Features

- **JWT** tokens for all protected routes (7-day expiry)
- **bcrypt** password hashing (salt rounds: 10)
- **Role-based** access control (student/teacher/admin)
- **QR tokens** expire after 5 minutes (configurable)
- **Unique index** on `(studentId, sessionId)` prevents duplicate attendance
- Input **validation** on all POST endpoints

---

## 📊 Features by Role

### 🧑‍🎓 Student
- Dashboard with attendance % per subject
- Bar chart of attendance by subject
- Camera-based QR code scanner
- Full attendance history per class

### 👩‍🏫 Teacher
- Create and manage classes
- Enroll students into classes
- Generate time-limited QR codes (live countdown timer)
- View attendance per session
- Download CSV report
- Donut chart of class performance

### 🔴 Admin
- System-wide statistics
- Daily attendance trend (line chart)
- Subject attendance comparison (bar chart)
- User management (activate/deactivate)
- Low attendance detection with configurable threshold

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Charts | Chart.js 4.4 |
| QR Scanner | html5-qrcode (CDN) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JSON Web Tokens + bcryptjs |
| QR Generation | `qrcode` npm package |
| CSV Export | `csv-writer` npm package |
