# SkillForge — Adaptive Skill-Learning Platform (MERN Foundation)

SkillForge is an adaptive skill-learning platform that diagnoses your proficiency level and dynamically generates personalized learning roadmaps with real YouTube resources, powered by the Gemini API.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) + Tailwind CSS + React Router |
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose ODM) — auto in-memory for local dev |
| Auth | JWT + bcryptjs |
| AI Roadmap | Google Gemini API (`gemini-1.5-flash`) |
| Video Resources | YouTube Data API v3 |

---

## 📂 Project Structure

```
skillforge/
├── backend/
│   ├── data/questions/          # JSON question banks (30 questions × 4 domains)
│   │   ├── webdev.json
│   │   ├── python.json
│   │   ├── dsa.json
│   │   └── ml.json
│   ├── src/
│   │   ├── config/db.js         # MongoDB connection (auto in-memory fallback)
│   │   ├── middleware/auth.js   # JWT verification middleware
│   │   ├── models/              # Mongoose schemas with explicit ObjectId refs
│   │   │   ├── User.js          # email, passwordHash, currentTier
│   │   │   ├── AssessmentResult.js  # userId ref, domain, tier, score
│   │   │   ├── Roadmap.js       # userId ref, goal, modules: [ObjectId ref]
│   │   │   ├── Module.js        # roadmapId ref, title, description, resources
│   │   │   ├── ModuleProgress.js    # userId ref, moduleId ref, status
│   │   │   └── XpEvent.js       # userId ref, amount, reason
│   │   ├── routes/
│   │   │   ├── health.js        # GET /api/health
│   │   │   ├── auth.js          # POST /api/auth/register & /login
│   │   │   ├── assessment.js    # GET questions, POST submit, GET debug-results
│   │   │   ├── dashboard.js     # GET /api/dashboard/stats
│   │   │   ├── roadmap.js       # POST /generate, GET /, GET /list
│   │   │   └── course.js        # GET /:id, POST /:id/progress
│   │   ├── services/
│   │   │   ├── geminiService.js # Gemini API: roadmap generation (2-phase, JSON retry)
│   │   │   └── youtubeService.js # YouTube Data API v3 video search
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/Navbar.jsx
    │   └── pages/
    │       ├── DashboardPage.jsx    # Goal input → roadmap generation
    │       ├── AssessmentPage.jsx   # Domain selection + adaptive 15-Q flow
    │       ├── RoadmapPage.jsx      # Vertical timeline with locked/unlocked state
    │       ├── CourseDetailPage.jsx # Module resources + progress toggle
    │       ├── LoginPage.jsx
    │       └── RegisterPage.jsx
    └── package.json
```

---

## 🚀 Setup & Launch

### Prerequisites
- Node.js v18+
- npm v9+
- **Gemini API key** — from [Google AI Studio](https://aistudio.google.com)
- **YouTube Data API v3 key** — from [Google Cloud Console](https://console.cloud.google.com)

### 1. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
# Optional: provide a real MongoDB URI or leave blank for auto in-memory
MONGODB_URI=

JWT_SECRET=your_secret_here

# Required for roadmap generation:
GEMINI_API_KEY=your_gemini_key_here

# Required for real YouTube video resources:
YOUTUBE_API_KEY=your_youtube_key_here
```

> **Note**: If `MONGODB_URI` is left blank, the backend automatically starts an in-memory MongoDB instance — no installation required.

### 2. Install & Run Backend

```bash
cd backend
npm install
npm start            # Production start
# or
npm run dev          # Hot-reload with nodemon
```

Backend runs at **`http://localhost:5000`**. Verify:
```
GET http://localhost:5000/api/health
→ {"status":"healthy","database":"connected",...}
```

### 3. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **`http://localhost:5173`**.

---

## 🔗 Scaffolded Routes

| Frontend Route | Page | Feature |
|---------------|------|---------|
| `/dashboard` | DashboardPage | Goal input, roadmap generation, XP stats |
| `/assessment` | AssessmentPage | Domain selection + adaptive 15-question diagnostic |
| `/roadmap` | RoadmapPage | Vertical timeline with locked/unlocked modules |
| `/course/:id` | CourseDetailPage | Module resources, YouTube links, progress toggle |
| `/login` | LoginPage | JWT authentication |
| `/register` | RegisterPage | Account creation |

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + DB status |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login + get JWT |
| GET | `/api/assessment/domains` | List assessment domains |
| GET | `/api/assessment/questions?domain=webdev` | Load question bank |
| POST | `/api/assessment/submit` | Save result, update user tier |
| GET | `/api/assessment/debug-results` | Inspect saved results in DB |
| POST | `/api/roadmap/generate` | **AI roadmap generation** (Gemini + YouTube) |
| GET | `/api/roadmap` | Fetch latest roadmap with module progress |
| GET | `/api/roadmap/list` | Debug: list all saved roadmaps |
| GET | `/api/course/:id` | Module detail + resources |
| POST | `/api/course/:id/progress` | Update module progress status |

---

## 🤖 AI Roadmap Generation — How It Works

`POST /api/roadmap/generate` runs a multi-phase pipeline:

1. **User tier lookup** — reads `User.currentTier` from MongoDB
2. **Gemini Phase 1** — sends goal + tier to `gemini-1.5-flash`, returns structured JSON roadmap (ordered modules with `searchQuery` per module). Invalid JSON triggers one automatic retry.
3. **YouTube Phase** — calls YouTube Data API v3 for each module's `searchQuery`, fetching 2–3 real video results per module. API key is read from `process.env.YOUTUBE_API_KEY` — never hardcoded.
4. **Gemini Phase 2** — passes real YouTube results back to Gemini, which selects the most pedagogically relevant video per module. The LLM cannot invent video IDs.
5. **Mongoose persistence** — saves `Roadmap` + `Module` documents with explicit `ObjectId` refs, creates `ModuleProgress` records (`not_started`), and awards an `XpEvent`.
6. **Response** — returns fully populated roadmap with real resource links.

---

## 🗄️ Mongoose Schemas (ObjectId References)

```
User ─────────────────────┐
  └─ AssessmentResult.userId ref: User
  └─ Roadmap.userId ref: User
       └─ Module.roadmapId ref: Roadmap
            └─ Roadmap.modules[]: [ObjectId ref: Module]
  └─ ModuleProgress.userId ref: User
  └─ ModuleProgress.moduleId ref: Module
  └─ XpEvent.userId ref: User
```
# SkillQuest

Adaptive Skill-Learning Platform powered by Gemini AI, MERN stack, streak gamification, and dynamic curriculum generation.
