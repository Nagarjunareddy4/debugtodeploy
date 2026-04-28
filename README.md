# 🚀 DebugToDeploy

**A premium AI-powered DevOps learning platform** — helping engineers go from debugging to deploying production-grade systems.

---

## 📖 About

DebugToDeploy is an interactive web application designed to accelerate DevOps mastery through:

- **AI-generated personalized roadmaps** tailored to your experience level and career goal
- **Hands-on cloud labs** with real Kubernetes YAML debugging challenges
- **AI mock interviews** with text, audio, and video modes and real-time AI feedback
- **Progress tracking** with XP, day-wise streaks, and a real-time activity graph
- **AI Support Assistant** for real-time DevOps troubleshooting
- **Free & Pro tiers** with role-based feature gating and daily usage limits

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer) |
| Routing | React Router v7 |
| Charts | Recharts |
| Backend API | Vercel Serverless Functions / Express Node.js |
| Auth & DB | Supabase |
| AI Integration | OpenAI GPT-4o-mini (Secured via Backend Proxy) |
| Payments | Razorpay (Subscriptions API) |
| Build Tool | Vite 6 |

---

## 📁 Project Structure

```
.
├── api/
│   ├── subscription/            # Razorpay integration (create & verify)
│   ├── webhook/                 # Razorpay automated webhooks
│   └── openai-proxy.js          # Secure edge proxy for OpenAI requests
├── server/
│   └── index.js                 # Express dev server (for local backend proxy testing)
├── src/
│   ├── components/
│   │   ├── layout/              # Sidebar & Navigation
│   │   ├── ui/                  # Reusable UI components
│   │   └── AiSupportBot.tsx     # Floating AI Support Widget
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client setup
│   │   ├── usageLimit.ts        # Client-side usage tracking helpers
│   │   └── utils.ts             # Utility helpers
│   ├── pages/
│   │   ├── Auth.tsx             # Login, Sign Up, & Password Recovery
│   │   ├── Dashboard.tsx        # Main dashboard with XP graph
│   │   ├── Roadmap.tsx          # AI roadmap generator
│   │   ├── LabList.tsx          # Cloud lab selection
│   │   ├── LabDetail.tsx        # Interactive YAML editor
│   │   ├── MockInterviews.tsx   # AI voice/text interview sessions
│   │   ├── Pricing.tsx          # Subscription plan tiers
│   │   ├── Checkout.tsx         # Secure Razorpay checkout flow
│   │   ├── Support.tsx          # Contact forms & feedback
│   │   └── Settings.tsx         # Profile management
│   ├── App.tsx                  # Root app & Auth Guard
│   └── index.css                # Global styles & brand tokens
└── supabase_migrations.sql      # Database schema setup
```

---

## 🔐 Security & Infrastructure

- **Database Security:** All user data is protected via **Supabase Row Level Security (RLS)** — users can only read/write their own records. Admin overrides are strictly handled on the backend.
- **AI API Protection:** OpenAI requests are routed through a backend proxy, preventing API key exposure and enforcing server-side rate limits based on user subscription tiers.
- **Automated Billing:** Payments are securely processed via Razorpay. Webhooks listen for lifecycle events (`subscription.charged`, `payment.failed`, etc.) to automatically upgrade/downgrade user accounts in the database without manual intervention.
- **Environment Configurations:** All sensitive keys (Database URLs, API secrets, Webhook signatures) are stored as environment variables and are securely excluded from source control.

---

## 📜 License

Apache 2.0 — see [LICENSE](LICENSE) for details.
