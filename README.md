# HireTrack

**HireTrack** is a full-stack job search management platform built as a monorepo. It gives job seekers a command center to track every application, visualize their pipeline, analyze performance data, export reports, and stay organized through the entire hiring process.

---

## Features

### Core Dashboard
- **Kanban Board** — drag-and-drop applications across fully customizable pipeline stages
- **Application Detail** — status tracking, notes, interview dates, salary, and contact info per application
- **Multiple Campaigns** — separate job searches (e.g., "Remote Roles", "Local Companies")

### Analytics
- Conversion funnel by pipeline stage
- Weekly activity chart (last 12 weeks)
- Source performance with response rates
- Average time spent in each stage
- Resume performance comparison
- Salary range distribution
- Momentum score (weighted activity metric)
- **Export as PDF** — branded, multi-page analytics report
- **Export as CSV** — all applications as a spreadsheet (Excel-compatible with UTF-8 BOM)

### JD Vault
- Save job descriptions from LinkedIn and YemenHR using the Chrome extension
- AI-powered keyword extraction (skills, experience, education)
- Full-text search, archive, and PDF export per JD

### Resumes
- Upload and manage multiple resume versions
- Track which resume was used per application
- Response rate analysis per resume

### Reminders & Notifications
- Manual and auto-generated reminders on stage changes
- In-app notification center with read/unread status

### Email Templates
- Reusable templates for follow-ups, thank-you notes, and networking
- Variable substitution (`{role}`, `{company}`, `{contact}`)

### Internationalization
- Full Arabic language support for all UI elements
- RTL layout: sidebar repositions to the right automatically

### Settings
- Profile editing (name, timezone)
- Weekly digest toggle
- Light / Dark theme with localStorage persistence and anti-flash
- Language selector (English / Arabic)
- Data export (CSV)
- Account deletion (GDPR-compliant, cascades all data)

### Browser Extension
- Detects job postings on LinkedIn and YemenHR
- One-click save to HireTrack with pre-filled company, role, location, and URL
- Persistent background connection to the web app session

---

## Tech Stack

### Monorepo
| Tool | Purpose |
|------|---------|
| [Turborepo](https://turbo.build) | Monorepo task orchestration |
| TypeScript | End-to-end type safety |

### Frontend (`apps/web`)
| Tool | Purpose |
|------|---------|
| Next.js 16 | React framework with App Router |
| NextAuth v5 | Authentication (Google, GitHub, Email OTP) |
| @dnd-kit | Accessible drag-and-drop for the Kanban board |
| Vanilla CSS | Custom design system with CSS variables |
| `@ducanh2912/next-pwa` | Service worker + PWA manifest |

### Backend (`apps/api`)
| Tool | Purpose |
|------|---------|
| NestJS 11 | Modular REST API framework |
| Prisma | ORM with type-safe DB access |
| PostgreSQL | Primary database |
| PDFKit | PDF generation (JD export + analytics report) |
| Resend | Transactional email (OTP + password reset) |
| Helmet + Throttler | Security headers and rate limiting |
| OpenRouter (OpenAI API) | AI-powered JD keyword extraction |

### Browser Extension (`apps/extension`)
| Tool | Purpose |
|------|---------|
| Manifest V3 | Chrome extension platform |
| Content scripts | DOM scraping for LinkedIn and YemenHR |

---

## Project Structure

```
hiretrack/
├── apps/
│   ├── api/              # NestJS REST API
│   │   ├── src/
│   │   │   ├── auth/         # JWT auth, OTP, OAuth, password reset
│   │   │   ├── application/  # CRUD + CSV export
│   │   │   ├── analytics/    # 8 analytics endpoints + PDF report
│   │   │   ├── campaign/     # Campaigns + columns
│   │   │   ├── reminder/     # Reminders + auto-generate
│   │   │   ├── resume/       # File upload + performance
│   │   │   ├── job-description/ # JD vault + AI analysis + PDF
│   │   │   └── ...
│   │   ├── prisma/           # Schema + migrations
│   │   ├── Dockerfile        # Multi-stage production image
│   │   └── railway.toml      # Railway deployment config
│   │
│   ├── web/              # Next.js frontend
│   │   ├── app/
│   │   │   ├── (dashboard)/  # Protected dashboard routes
│   │   │   ├── login/        # Login + OTP verify
│   │   │   └── page.tsx      # Landing page
│   │   ├── lib/
│   │   │   ├── api.ts        # Typed API client
│   │   │   └── i18n/         # English + Arabic translations
│   │   └── public/           # PWA manifest + icons
│   │
│   └── extension/        # Chrome extension (Manifest V3)
│
├── packages/             # Shared ESLint + TypeScript configs
└── turbo.json
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (local or [Neon](https://neon.tech) free tier)
- npm 10+

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/hiretrack.git
cd hiretrack
npm install
```

### 2. Configure Environment Variables

**API** — copy and fill in `apps/api/.env`:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/hiretrack"
JWT_SECRET="your-64-char-random-string"
JWT_REFRESH_SECRET="another-64-char-random-string"
FRONTEND_URL="http://localhost:3000"
PORT=4000

# Optional: email (Resend)
RESEND_API_KEY="re_your_key_here"
FROM_EMAIL="HireTrack <noreply@yourdomain.com>"

# Optional: AI analysis
OPENROUTER_API_KEY="sk-or-..."
```

**Web** — copy and fill in `apps/web/.env.local`:
```bash
AUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 3. Set Up the Database

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

### 4. Run the Development Servers

```bash
# From the repo root — starts API + Web in parallel
npm run dev
```

Or individually:
```bash
# API only
cd apps/api && npm run start:dev

# Web only
cd apps/web && npm run dev
```

### 5. Load the Browser Extension

1. Build the extension (if needed): the `/apps/extension` folder is already in Manifest V3 format
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select `apps/extension`

---

## Deployment

> See the full deployment guide in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

| Service | Provider |
|---------|----------|
| Frontend | Firebase App Hosting / Vercel |
| API | Railway |
| Database | Supabase (PostgreSQL) |
| Email | Resend |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Email registration |
| `POST` | `/api/v1/auth/send-code` | Send OTP |
| `POST` | `/api/v1/auth/verify-code` | Verify OTP |
| `POST` | `/api/v1/auth/email-login` | Login with password |
| `GET` | `/api/v1/applications` | List all applications |
| `GET` | `/api/v1/applications/export/csv` | Download CSV export |
| `GET` | `/api/v1/analytics/overview` | Aggregated stats |
| `GET` | `/api/v1/analytics/export/pdf` | Download PDF report |
| `GET` | `/api/v1/health` | Health check |
| … | | Full route list in each module's controller |

---

## License

MIT — free to use, modify, and distribute.
