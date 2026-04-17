# 🚀 DebugToDeploy

**A premium AI-powered DevOps learning platform** — helping engineers go from debugging to deploying production-grade systems.

---

## 📖 About

DebugToDeploy is an interactive web application designed to accelerate DevOps mastery through:

- **AI-generated personalized roadmaps** tailored to your experience level and career goal
- **Hands-on cloud labs** with real Kubernetes YAML debugging challenges
- **AI mock interviews** with text, audio, and video modes and real-time AI feedback
- **Progress tracking** with XP, day-wise streaks, and a real-time activity graph
- **Free & Pro tiers** with daily usage limits for AI features on the free plan

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer) |
| Routing | React Router v7 |
| Charts | Recharts |
| Backend / Auth / DB | Supabase |
| AI Features | OpenAI GPT-4o-mini |
| Build Tool | Vite 6 |

---

## ✨ Features

### 🗺 AI Roadmap Generator
- Generates a 4–6 stage personalized DevOps career roadmap
- Persists your roadmap to the database across sessions
- Asks for confirmation before overwriting an existing roadmap
- **Free:** 1 generation/day · **Pro:** Unlimited

### 🧪 Cloud Labs
- Scenario-based Kubernetes YAML debugging exercises
- Multi-step challenges with a live terminal output panel
- Sequential lab unlocking based on completion progress
- Awards XP on completion (logged to daily activity)

### 🎙 AI Mock Interviews
- 3 interview tracks: Kubernetes, Terraform, CI/CD
- Three modes: **Text** (with AI feedback), **Audio** (mic recording), **Video** (camera + PiP layout)
- Real-time AI feedback on text answers using OpenAI
- **Free:** 2 interviews/day · **Pro:** Unlimited

### 📊 Dashboard
- Personalized greeting using your real display name
- Dynamic "Next Up" lab based on completion progress
- Real-time EXP and Labs progress graph (last 7 days)
- Day-wise streak tracking (continues if active yesterday, resets otherwise)
- Free-tier AI search bar — 2 queries/day

### 💰 Pricing Tiers
| Plan | Price | Key Limits |
|---|---|---|
| Free Fleet | $0/mo | 1 roadmap, 2 searches, 2 interviews/day |
| Fleet Captain | $29/mo | Unlimited AI features |
| System Admiral | $99/mo | Everything + API access + Team management |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone & Install

```bash
git clone https://github.com/Nagarjunareddy4/debugtodeploy.git
cd debugtodeploy
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_OPENAI_API_KEY=sk-your-openai-key
```

> ⚠️ **Never commit `.env` to git.** It is already listed in `.gitignore`.

### 3. Run Database Migrations

In your Supabase dashboard → **SQL Editor**, run the contents of:

```
supabase_migrations.sql
```

This creates all required tables (`profiles`, `activity_log`) with correct RLS policies and Realtime subscriptions.

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx          # Navigation sidebar
│   └── ui/
│       └── Logo.tsx             # App logo component
├── lib/
│   ├── supabase.ts              # Supabase client setup
│   ├── usageLimit.ts            # Free-tier daily usage tracking
│   └── utils.ts                 # Utility helpers (cn, etc.)
├── pages/
│   ├── Auth.tsx                 # Login & Sign up
│   ├── Dashboard.tsx            # Main dashboard with graph & streak
│   ├── Roadmap.tsx              # AI roadmap generator
│   ├── LabList.tsx              # Lab listing with lock/unlock
│   ├── LabDetail.tsx            # Interactive lab editor & console
│   ├── MockInterviews.tsx       # AI interview sessions
│   ├── Pricing.tsx              # Subscription plans
│   └── Settings.tsx             # User settings & API config
├── App.tsx                      # Root app with auth guard & routing
├── main.tsx                     # Entry point
└── index.css                    # Global styles & design tokens
supabase_migrations.sql          # Database schema migrations
```

---

## 🔐 Security Notes

- All user data is protected via **Supabase Row Level Security (RLS)** — users can only read/write their own records
- API keys are stored in `.env` (excluded from git) and accessed via `import.meta.env`
- Free-tier usage limits are tracked client-side via `localStorage` (keyed by date)

---

## 📜 License

Apache 2.0 — see [LICENSE](LICENSE) for details.
