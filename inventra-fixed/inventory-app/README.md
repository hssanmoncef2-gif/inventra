# 📦 Inventra — Full-Stack Inventory Management System

A production-ready inventory management platform built with Node.js, MongoDB, and React.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth & Security** | JWT + Refresh tokens, bcrypt, rate limiting, XSS/injection protection |
| **Role-based Access** | Admin · Owner · Manager · Employee (with granular permissions) |
| **Inventory CRUD** | Name, reference, price, quantity, category, unit, image, min-stock alerts |
| **Dashboards** | Role-specific stats, pie charts, low-stock alerts |
| **Reports** | Full inventory breakdown, category analysis, PDF export |
| **Chatbot** | AI inventory assistant (Claude API) |
| **Dark/Light Mode** | Persistent theme toggle |
| **Backups** | Automatic daily JSON backups, keeps last 30 |
| **Docker** | One-command deploy with docker-compose |

---

## 🚀 Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Clone / extract the project
cd inventory-app

# 2. Copy and configure env
cp backend/.env.example backend/.env
# Edit backend/.env with your values (especially ANTHROPIC_API_KEY)

# 3. Launch everything
docker compose up -d

# App is now live at:
#   Frontend: http://localhost:3000
#   Backend:  http://localhost:5000
```

### Option B — Local Development

**Prerequisites:** Node.js 18+, MongoDB running locally

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env       # Fill in your values
npm install
npm run dev                # Starts on :5000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev                # Starts on :3000
```

---

## 🔐 Default Admin

```
Email:    hssanmoncef@gmail.com
Password: 13579Moncef
```

> **Change the password immediately after first login!**

---

## 👥 Role System

| Role | Inventory | Users | Analytics | Reports | Admin Panel |
|---|---|---|---|---|---|
| **Admin** | Full | Full | ✅ | ✅ | ✅ |
| **Owner** | Full | View | ✅ | ✅ | ❌ |
| **Manager** | Full | Employees only | ✅ | ✅ | ❌ |
| **Employee** | View + optional CRUD* | ❌ | ❌ | ❌ | ❌ |

*Employee permissions (Add/Edit/Delete) are granted individually by managers or admins.

---

## 🛠 Tech Stack

### Backend
- **Express.js** — REST API
- **MongoDB + Mongoose** — Database & ODM
- **JWT** — Stateless auth with refresh tokens
- **Helmet** — Security headers
- **express-rate-limit** — Brute-force protection
- **Multer** — Image uploads
- **node-cron** — Scheduled backups

### Frontend
- **React 18 + Vite** — UI framework
- **React Router v6** — Client-side routing
- **Chart.js + react-chartjs-2** — Data visualization
- **jsPDF + jspdf-autotable** — PDF export
- **axios** — HTTP client with interceptors
- **react-hot-toast** — Notifications

### Infrastructure
- **Docker + Docker Compose** — Containerization
- **Nginx** — Frontend serving + reverse proxy

---

## 📁 Project Structure

```
inventory-app/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT verification, role checks
│   │   └── security.js      # Rate limiting, XSS, injection protection
│   ├── models/
│   │   ├── User.js          # User schema with roles & permissions
│   │   └── Inventory.js     # Inventory schema with audit trail
│   ├── routes/
│   │   ├── auth.js          # Register, login, refresh, logout
│   │   ├── inventory.js     # Full CRUD + analytics
│   │   ├── users.js         # User management
│   │   └── chatbot.js       # AI assistant endpoint
│   ├── utils/
│   │   ├── backup.js        # JSON backup utility
│   │   └── seed.js          # Default admin seeder
│   ├── server.js            # Express app entry point
│   └── .env                 # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   └── AppShell.jsx   # Layout, sidebar, topbar
│   │   │   └── chatbot/
│   │   │       └── Chatbot.jsx    # Floating AI chatbot
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Global auth state
│   │   │   └── ThemeContext.jsx   # Dark/light mode
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   └── ReportsPage.jsx
│   │   ├── utils/
│   │   │   └── api.js             # Axios instance + token refresh
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css              # Design system + all styles
│   └── nginx.conf
│
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/register` | Admin/Manager | Create user |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Auth | Logout |
| GET | `/api/auth/me` | Auth | Get current user |

### Inventory
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/inventory` | Auth | List items (paginated) |
| GET | `/api/inventory/analytics` | Manager+ | Stats & analytics |
| GET | `/api/inventory/categories` | Auth | List categories |
| GET | `/api/inventory/:id` | Auth | Get single item |
| POST | `/api/inventory` | Manager+ / Employee (perm) | Create item |
| PUT | `/api/inventory/:id` | Manager+ / Employee (perm) | Update item |
| DELETE | `/api/inventory/:id` | Manager+ / Employee (perm) | Soft delete |

### Users
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Manager+ | List users |
| GET | `/api/users/admin/overview` | Admin | Admin dashboard stats |
| PUT | `/api/users/:id` | Manager+ | Update user/permissions |
| DELETE | `/api/users/:id` | Admin | Deactivate user |

---

## 🔒 Security Features

- **Helmet.js** — Sets 14 security HTTP headers
- **Rate limiting** — 200 req/15min general, 10 req/15min for auth
- **JWT + Refresh Tokens** — Short-lived access (15m), long-lived refresh (7d), stored per-session
- **bcrypt** — Passwords hashed with 12 salt rounds
- **XSS sanitization** — All inputs sanitized server-side
- **MongoDB injection prevention** — Blocks `$` operators in requests
- **Input validation** — express-validator on all routes
- **Soft deletes** — Data never permanently deleted

---

## 🌍 Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `MONGODB_URI` | localhost | ✅ | MongoDB connection string |
| `JWT_SECRET` | — | ✅ | JWT signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | — | ✅ | Refresh token secret (32+ chars) |
| `DEFAULT_ADMIN_EMAIL` | — | ✅ | First admin account email |
| `DEFAULT_ADMIN_PASSWORD` | — | ✅ | First admin account password |
| `ANTHROPIC_API_KEY` | — | Optional | For AI chatbot (Claude) |
| `PORT` | 5000 | — | Backend port |
| `FRONTEND_URL` | http://localhost:3000 | — | CORS allowed origin |

---

## 🔧 Customization Guide

### Adding a new role
1. Edit `backend/models/User.js` → add role to enum
2. Edit `backend/middleware/auth.js` → update hierarchy
3. Edit `frontend/src/context/AuthContext.jsx` → add role helper

### Adding inventory fields
1. Edit `backend/models/Inventory.js` → add field to schema
2. Edit `frontend/src/pages/InventoryPage.jsx` → add to form + table
3. Edit `frontend/src/pages/ReportsPage.jsx` → add to PDF export

### Changing backup schedule
Set `BACKUP_CRON` in `.env` using cron syntax:
- `0 2 * * *` — Daily at 2 AM (default)
- `0 */6 * * *` — Every 6 hours
- `0 2 * * 0` — Weekly on Sunday

---

## 🚢 Production Deployment

1. **Set strong secrets** — Replace all default values in `.env`
2. **Use MongoDB Atlas** — Free 512MB tier: https://cloud.mongodb.com
3. **Get Anthropic API key** — https://console.anthropic.com (for chatbot)
4. **Deploy to Railway / Render / DigitalOcean** — All support Docker Compose
5. **Enable HTTPS** — Use a reverse proxy like Traefik or Caddy in front

---

## 📄 License

MIT — Free for personal and commercial use.
