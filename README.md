# SkillQuest — Adaptive AI Skill-Learning Platform (MERN + Gemini AI)

**SkillQuest** is a next-generation adaptive skill-learning and engineering community platform. It diagnoses your engineering proficiency, dynamically generates personalized learning roadmaps with curated YouTube resources, and powers real-time collaborative study lounges with live audio, competitive mastery leaderboards, timed AI quizzes, and peer code reviews.

---

## 🌟 Core Feature Highlights

- 🧠 **Diagnostic Assessment Engine**: 15-question adaptive assessment across Web Dev, Python, DSA, and ML that calibrates your engineering tier (`Beginner`, `Intermediate`, `Advanced`).
- 🗺️ **AI Curriculum & Roadmap Pipeline**: Multi-phase Gemini AI (`gemini-1.5-flash`) roadmap generator coupled with the YouTube Data API v3 to map modules to high-quality video tutorials.
- 🎙️ **Collaborative Study Lounges**: Community study rooms with unique 6-character room codes, real-time group chat, WebRTC audio sharing, and synchronized module learning.
- ⚡ **Timed Adaptive AI Quiz Mode**: 10-question tier-calibrated quiz per module featuring a 45-second per-question countdown timer, animated SVG progress rings, question navigator, and in-depth review mode with explanations.
- 🏆 **Mastery Leaderboard & Podium**: Global competitive arena with Gold, Silver, and Bronze podium pedestals, All-Time Hall vs. Weekly Sprint toggles, search filters, and tier badges.
- 👥 **Peer Review & Project Showcase**: Community hub where students submit capstone projects (GitHub/live URLs, tech stack tags), upvote solutions, and leave 1–5 star reviews for XP rewards.
- 🔥 **Streak Gamification & Activity Heatmap**: Daily streak engine with 48-hour activity validation, dynamic XP multipliers, level progression, and a GitHub-style 52-week annual activity heatmap on user profiles.
- 📄 **AI Resume & ATS Gap Analyzer**: Compares candidate resumes against target job descriptions to identify missing skills and generate instant remedial modules.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Details |
|-------|------------|---------|
| **Frontend** | React 18 (Vite) + Tailwind CSS + Lucide Icons | Responsive modern SPA with rich micro-animations & glassmorphism |
| **Backend** | Node.js + Express.js | REST API, WebSocket/polling architecture, modular routers |
| **Database** | MongoDB Atlas / Local MongoDB via Mongoose ODM | Cloud Cluster connected with in-memory fallback for local dev |
| **Authentication** | JWT (JSON Web Tokens) + bcryptjs | Secure stateless authentication with auth headers context |
| **AI Engine** | Google Gemini API (`@google/generative-ai`) | Multi-key rotation manager (`KeyRotator`) with fallback mechanisms |
| **Video Resources** | YouTube Data API v3 | Search queries mapped to curated video tutorials |
| **Collaboration** | WebRTC + REST / In-memory Room Store | Real-time audio sharing and room synchronization |

---

## 📂 Project Structure

```
SkillQuest/
├── backend/
│   ├── data/questions/               # Assessment question banks (4 domains × 30 Qs)
│   │   ├── webdev.json
│   │   ├── python.json
│   │   ├── dsa.json
│   │   └── ml.json
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB Atlas connection + in-memory fallback
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT verification & optionalAuth middleware
│   │   ├── models/                   # Mongoose schemas with ObjectId references
│   │   │   ├── User.js               # Email, passwordHash, tier, XP, streakDays, lastActiveAt
│   │   │   ├── AssessmentResult.js   # Domain, score, tier, user ref
│   │   │   ├── Roadmap.js            # User ref, goal, module refs
│   │   │   ├── Module.js             # Resources, key concepts, quiz, video details
│   │   │   ├── ModuleProgress.js     # User ref, module ref, status, quizScore
│   │   │   ├── XpEvent.js            # User ref, amount, multipliers, breakdown
│   │   │   ├── Room.js               # Study room schema (code, module, members, messages)
│   │   │   └── Submission.js         # Peer review capstones, upvotes, reviews, ratings
│   │   ├── routes/
│   │   │   ├── health.js             # GET /api/health
│   │   │   ├── auth.js               # POST /api/auth/register & /login
│   │   │   ├── assessment.js         # Domain questions & submission
│   │   │   ├── dashboard.js          # Stats, XP progression & Leaderboard
│   │   │   ├── roadmap.js            # AI roadmap generator & fetch
│   │   │   ├── course.js             # Module details, progress, & 10-Q AI quiz endpoint
│   │   │   ├── rooms.js              # Study room creation, join, chat, & audio signaling
│   │   │   ├── peer.js               # Peer review showcase feed, submit, upvote, review
│   │   │   ├── profile.js            # User profile, 52-week heatmap stats, & bio updates
│   │   │   ├── progress.js           # Module completion & streak testing
│   │   │   └── resume.js             # Resume ATS comparison & remedial module generation
│   │   ├── services/
│   │   │   ├── geminiService.js      # Gemini roadmap, module, remedial & quiz generator
│   │   │   ├── youtubeService.js     # YouTube search integration
│   │   │   └── xpEngine.js           # XP formula, tier levels, & streak multipliers
│   │   ├── utils/
│   │   │   ├── apiKeyManager.js      # KeyRotator supporting multi-key failover
│   │   │   ├── resumeExtractor.js    # Resume text extraction and parsing utilities
│   │   │   └── schemas.js            # Validation schemas for API requests
│   │   └── server.js                 # Express server configuration
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx            # Sticky navigation with live streak flame & user menu
    │   │   ├── ResumeAnalyzer.jsx    # Resume upload and ATS gap analysis component
    │   │   ├── ActivityHeatmap.jsx   # GitHub-style 52-week annual activity heatmap
    │   │   └── XpToast.jsx           # Animated floating XP bounty notifications
    │   ├── context/
    │   │   └── AuthContext.jsx       # Global authentication state & token manager
    │   ├── pages/
    │   │   ├── DashboardPage.jsx     # Goal planner, stats cards, quick roadmap trigger
    │   │   ├── AssessmentPage.jsx    # Domain selector + adaptive diagnostic quiz
    │   │   ├── RoadmapPage.jsx       # Vertical timeline quest path with lock/unlock states
    │   │   ├── CourseDetailPage.jsx  # In-depth module guide, key concepts, & resources
    │   │   ├── QuizPage.jsx          # Timed 10-question AI quiz with circular countdown ring
    │   │   ├── StudyRoomsPage.jsx    # Study lounges directory + create/join room modal
    │   │   ├── StudyRoomDetailPage.jsx# Live study room (group chat, WebRTC audio, module sync)
    │   │   ├── LeaderboardPage.jsx   # Top 3 podium, weekly vs all-time filters, user rank
    │   │   ├── PeerReviewPage.jsx    # Code showcase, project submissions, upvoting & reviews
    │   │   ├── ProfilePage.jsx       # User stats, GitHub heatmap, tier badge, profile settings
    │   │   ├── LoginPage.jsx         # Sign-in portal
    │   │   └── RegisterPage.jsx      # Sign-up portal
    │   ├── App.jsx                   # Central routing & layout
    │   ├── main.jsx                  # React entrypoint
    │   └── index.css                 # Custom utility styles, gradients, glassmorphism
    └── package.json
```

---

## 🌐 Application Routes & Pages

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | `DashboardPage` | Command center with current level, XP breakdown, goal creator, and recent activity. |
| `/assessment` | `AssessmentPage` | 15-question adaptive diagnostic to calibrate engineering proficiency. |
| `/roadmap` | `RoadmapPage` | Interactive Quest Path timeline displaying progressive unlock states. |
| `/course/:id` | `CourseDetailPage` | Comprehensive module guide with key concepts, code snippets, resources, and quiz links. |
| `/quiz/:id` | `QuizPage` | Timed 10-question adaptive AI quiz with 45s countdown timer per question and review mode. |
| `/rooms` | `StudyRoomsPage` | Study lounge community directory with room creation and room-code joiner. |
| `/room/:code` | `StudyRoomDetailPage` | Real-time study lounge with synchronized curriculum, group messaging, and WebRTC audio. |
| `/leaderboard`| `LeaderboardPage` | Global league table with Top 3 podium, All-Time vs Weekly filters, and search. |
| `/peer-review`| `PeerReviewPage` | Peer review showcase with project submissions, tech stack chips, upvotes, and reviews. |
| `/profile` | `ProfilePage` | User profile with level progress, tier badge, streak counter, and GitHub-style heatmap. |
| `/login` | `LoginPage` | Authentication portal. |
| `/register` | `RegisterPage` | Registration portal. |

---

## 📡 API Endpoints Reference

### Authentication & Profile
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in and obtain JWT token
- `GET /api/profile` — Fetch current user profile with 52-week activity heatmap history
- `PUT /api/profile` — Update user details (name, bio, target goal)

### Diagnostic & Roadmaps
- `GET /api/assessment/domains` — List available technical diagnostic domains
- `GET /api/assessment/questions?domain=<name>` — Load domain questions
- `POST /api/assessment/submit` — Submit diagnostic results and update proficiency tier
- `POST /api/roadmap/generate` — Generate adaptive roadmap with Gemini AI and YouTube API
- `GET /api/roadmap` — Fetch user's active roadmap with module completion states

### Courses & AI Quizzes
- `GET /api/course/:id` — Retrieve detailed module content, concepts, and video tutorial
- `POST /api/course/:id/progress` — Update module status and record completion score
- `GET /api/course/:id/quiz?count=10` — Generate or retrieve 10-question adaptive AI quiz

### Study Session Lounges
- `GET /api/rooms` — List all active community study rooms
- `POST /api/rooms/create` — Create a new study room with unique 6-character room code
- `GET /api/rooms/:code` — Retrieve room status, participants, and chat message history
- `POST /api/rooms/:code/join` — Join study room with room code
- `POST /api/rooms/:code/message` — Send chat message to room participants
- `POST /api/rooms/:code/signal` — WebRTC signaling relay for peer-to-peer audio streams

### Leaderboard & Peer Reviews
- `GET /api/dashboard/leaderboard?period=alltime|weekly` — Get top learners by XP
- `GET /api/peer/feed?sort=recent|top` — Community peer review project feed
- `POST /api/peer/submit` — Submit a capstone project for peer review
- `POST /api/peer/:id/upvote` — Upvote or remove upvote from a submission
- `POST /api/peer/:id/review` — Submit a 1–5 star rating and feedback review
- `GET /api/peer/my-submissions` — Fetch authenticated user's own submitted projects

### Resume & ATS Analysis
- `POST /api/resume/analyze` — Upload and analyze resume against job description
- `POST /api/resume/generate-remedial` — Generate targeted learning modules based on skill gaps
- `GET /api/resume/skills-report` — Retrieve skills assessment and recommended courses

---

## 🚀 Setup & Launch

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB Atlas** database cluster (or local MongoDB)
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com))
- **YouTube Data API v3 Key** (from [Google Cloud Console](https://console.cloud.google.com))

### 1. Configure Backend Environment
Create `backend/.env` (or duplicate `backend/.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.bpxdzy6.mongodb.net/skillquest?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_2026

# Gemini API Key (supports single key or comma-separated list for auto-rotation)
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# YouTube Data API Key
YOUTUBE_API_KEY=AIzaSyYourYouTubeApiKeyHere

NODE_ENV=development
```

### 2. Install & Start Backend
```bash
cd backend
npm install
npm run dev
```
Backend API will start at **`http://localhost:5000`**.

### 3. Install & Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend client will start at **`http://localhost:5173`**.

---

## 🎮 Gamification Mechanics

- **XP Engine**: Base XP is awarded for completing modules (+100 XP), acing quizzes, submitting projects (+60 XP), and providing peer reviews (+40 XP).
- **Difficulty Multipliers**:
  - `Beginner`: 1.0× multiplier
  - `Intermediate`: 1.25× multiplier
  - `Advanced`: 1.5× multiplier
- **Daily Streak Bonus**: Every active day extends your streak counter. Users maintain a 48-hour activity grace period before streaks reset. Each active streak day adds extra bonus XP to every completed activity.
- **Annual Heatmap**: Visualizes coding and learning consistency over the past 365 days with GitHub-style color intensity levels.

---

## 📄 License
MIT &copy; SkillQuest Engineering Team
