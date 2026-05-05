# 📦 Inventra — Inventory Management System

A full-stack inventory management app with:
- **Dark mode by default** (toggle in the top bar)
- **3 languages**: English · Français · عربي (with RTL support)
- **Free AI Chatbot** powered by [Ollama](https://ollama.com) (llama3.2) — no API key, no cost
- **Docker deployment** (single command)

---

## 🚀 Quick Start with Docker

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- ~4GB free disk space (for the AI model)

### 1. Clone / extract the project
```bash
cd inventra
```

### 2. Configure environment (optional)
```bash
cp backend/.env.example backend/.env
# Edit backend/.env if you want to change admin credentials or ports
```

### 3. Start everything
```bash
docker compose up -d
```

That's it! Docker will:
1. Start MongoDB
2. Start Ollama (AI server)
3. **Auto-download llama3.2** (~2GB, one-time)
4. Build and start the backend API
5. Build and start the frontend

### 4. Open the app
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

### Default login
| Field | Value |
|-------|-------|
| Email | `admin@inventra.local` |
| Password | `Admin1234!` |

---

## 🤖 AI Chatbot (Ollama — 100% Free)

The chatbot uses **Ollama** running **llama3.2** locally:
- ✅ No API key required
- ✅ No usage limits
- ✅ Runs on your own machine (data stays private)
- ✅ Works in English, French, and Arabic

### First launch note
The AI model takes **1-3 minutes** to download on first run. The chatbot shows a yellow indicator while it's loading. Once ready, the indicator turns green.

### Change the AI model
You can use any Ollama model. Edit `docker-compose.yml` or set in your `.env`:
```env
OLLAMA_MODEL=mistral        # Better quality, 4GB
OLLAMA_MODEL=llama3.2:1b    # Faster, smaller, 1.3GB
OLLAMA_MODEL=phi3            # Great reasoning
```
Then restart: `docker compose restart backend`

### Use Ollama GPU acceleration (optional)
Uncomment the `deploy` block in `docker-compose.yml` under the `ollama` service (requires NVIDIA GPU + drivers).

---

## 🌙 Dark / Light Mode

Click the toggle switch in the top-right corner. The app **defaults to dark mode**.

---

## 🌐 Language Toggle

Click **EN / FR / ع** buttons in the top bar to switch languages instantly.
Arabic switches the entire UI to RTL layout.

---

## 🐳 Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View only backend logs
docker compose logs -f backend

# Stop everything
docker compose down

# Stop and delete all data (reset)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build

# Pull a different AI model
docker compose exec ollama ollama pull mistral
```

---

## 💻 Local Development (without Docker)

### Prerequisites
- Node.js 18+
- MongoDB running locally
- [Ollama](https://ollama.com/download) installed

### Setup
```bash
# Install Ollama and pull the model
ollama pull llama3.2

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set OLLAMA_URL=http://localhost:11434
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173, backend on http://localhost:5000.

---

## 📁 Project Structure

```
inventra/
├── backend/
│   ├── routes/
│   │   ├── chatbot.js      ← Ollama AI integration
│   │   ├── inventory.js
│   │   ├── auth.js
│   │   └── users.js
│   ├── models/
│   ├── middleware/
│   ├── .env                ← Your config
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       │   └── chatbot/Chatbot.jsx  ← Chat UI (multilingual)
│       └── context/
│           ├── ThemeContext.jsx     ← Dark mode (default: dark)
│           └── I18nContext.jsx      ← EN/FR/AR translations
└── docker-compose.yml      ← One-command deployment
```

---

## 🔒 Security Notes for Production

Change these in `docker-compose.yml` or via environment variables:
```env
JWT_SECRET=<strong-random-32-char-string>
JWT_REFRESH_SECRET=<another-strong-random-string>
DEFAULT_ADMIN_PASSWORD=<strong-password>
```

Generate a secure secret:
```bash
openssl rand -hex 32
```
