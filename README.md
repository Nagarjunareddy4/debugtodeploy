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
