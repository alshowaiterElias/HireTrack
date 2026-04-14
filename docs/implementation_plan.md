# HireTrack — Complete Product Plan

## Vision Statement
**HireTrack** is a premium, privacy-first job search command center that transforms chaotic job hunting into a data-driven, strategic campaign. Unlike competitors that are either too simple (spreadsheets) or too expensive (Huntr at $40/mo), HireTrack is **free, beautiful, and intelligent**.

---

## What Makes HireTrack Unique (Competitive Edge)

| Differentiator | How It Works |
|---|---|
| **Campaign System** | Job searches are organized as "Campaigns" (e.g., "Q2 2026 Frontend Push") with goals, deadlines, and progress tracking — not just a flat board |
| **Job Description Vault** | Auto-archives full JDs so they're available even after listings expire (a top user complaint) |
| **Momentum Score** | A daily-updated score (0-100) measuring search health: activity consistency, response rates, pipeline balance |
| **Smart Follow-up Engine** | Context-aware reminders that draft follow-up email templates based on where you are in the process |
| **Resume-to-Result Tracking** | Links resume versions to outcomes — see which resume actually gets callbacks |
| **Weekly Strategy Digest** | Auto-generated email summarizing your week: apps sent, responses received, action items, trends |
| **Privacy-First** | No email inbox access required. No selling data. Full data export/delete. |
| **Premium Design** | Glassmorphism, smooth animations, dark/light mode — feels like a $100/mo SaaS tool, costs $0 |

---

## Target Users & Personas

### Primary: Active Job Seekers (80% of users)
- Applying to 5-30+ jobs per week
- Losing track of where they applied and follow-up deadlines
- Using spreadsheets or nothing at all

### Secondary: Career Changers (15%)
- Exploring multiple industries simultaneously
- Need to compare pipelines across different role types

### Tertiary: Bootcamp/University Graduates (5%)
- First-time structured job search
- Need guidance and structure, not just tracking

---

## Core Feature Specification

### F1: Campaign Management
A **Campaign** is a time-bound job search effort. Users can run multiple campaigns.

| Field | Type | Details |
|---|---|---|
| Name | string | "Q2 2026 Frontend Search" |
| Goal | string | "Land a frontend role at a Series B+ startup" |
| Target Role | string | "Senior Frontend Engineer" |
| Target Salary Range | min/max | $120k - $160k |
| Start Date | date | Auto-set on creation |
| Target End Date | date | User-defined deadline |
| Status | enum | active / paused / completed |
| Weekly Application Goal | number | e.g., 10 per week |

**Board Columns** are per-campaign and customizable:
- Default: `Saved → Applied → Screen → Interview → Offer → Rejected → Withdrawn`
- Users can add/rename/reorder/color columns
- Column-level WIP limits (optional): "Max 5 in Interview stage"

### F2: Application Cards (The Core Unit)
Each card represents one job application with rich, structured data.

**Card Fields:**
- Company name, logo (auto-fetched via Clearbit/Logo.dev API)
- Role title, job URL, location, work type (remote/hybrid/onsite)
- Salary range (min/max), currency
- Source channel (LinkedIn, Indeed, referral, company site, recruiter, other)
- Applied date (auto-set when moved to "Applied" column)
- Priority (🔴 High / 🟡 Medium / 🟢 Low)
- Resume version used (linked)
- Cover letter (text or file)
- Job description (full text, auto-archived)
- Tags (user-defined: "React", "startup", "FAANG", etc.)
- Contact person (name, role, email, LinkedIn, phone)
- Notes (rich text, timestamped entries)
- Interview prep notes (separate section)
- Next action + due date
- Status timeline (auto-logged history of all moves)

**Card Interactions:**
- Drag-and-drop between columns (optimistic UI + undo toast)
- Quick-edit inline (click field to edit)
- Full detail view (slide-out panel)
- Archive (soft delete, recoverable)
- Duplicate (for similar roles at same company)

### F3: Job Description Vault
One of the most requested features across Reddit/ProductHunt.

- When a card is created (manually or via extension), the full JD text is captured and stored
- JD is searchable across all applications
- Highlight key requirements and compare against your resume
- JD persists even after the original listing is taken down
- PDF export of archived JD

### F4: Smart Reminders & Follow-up Engine
Not just "remind me in 7 days" — context-aware and actionable.

**Auto-generated reminders:**
| Trigger | Reminder | Timing |
|---|---|---|
| Applied, no response | "Follow up with [Company]?" | 7 days after apply |
| Phone screen completed | "Send thank-you email to [Contact]" | 1 day after |
| Interview scheduled | "Prep reminder: Interview with [Company] in 2 days" | 2 days before |
| Offer received | "Respond to [Company] offer before deadline" | 3 days before expiry |
| Stale card | "You haven't updated [Company] in 14 days" | 14 days no activity |

**Follow-up email templates:**
- Pre-built templates for each stage (post-apply, post-interview, negotiation)
- Personalized with company name, contact name, role
- Copy-to-clipboard with one click
- Users can customize/save their own templates

**Delivery channels:** In-app notification center + optional email digest

### F5: Analytics Dashboard
The "wow factor" — transforms raw data into strategic insights.

**Metrics & Visualizations:**

| Metric | Chart Type | Insight |
|---|---|---|
| Funnel Conversion | Horizontal funnel | Applied → Screen → Interview → Offer drop-off rates |
| Response Rate | Percentage gauge | % of applications that got any response |
| Weekly Activity | Area chart | Applications sent per week trend |
| Source Performance | Horizontal bar | Which channels yield most interviews |
| Resume Performance | Comparison table | Response rate per resume version |
| Average Time-in-Stage | Timeline chart | How long cards sit in each column |
| Active Pipeline | Stacked bar | Current distribution across stages |
| Momentum Score | Animated gauge | Overall search health (0-100) |
| Salary Distribution | Box plot | Offer ranges vs. your target |

**Momentum Score Algorithm:**
```
Score = (
  activity_consistency × 0.25 +    // Are you applying regularly?
  response_rate × 0.25 +           // Are companies responding?
  pipeline_balance × 0.20 +        // Healthy spread across stages?
  follow_up_completion × 0.15 +    // Are you following up?
  weekly_goal_achievement × 0.15   // Hitting your targets?
) × 100
```

### F6: Resume Version Manager
Track which resume drives results.

- Upload multiple PDF/DOCX resume versions
- Label each version (e.g., "Frontend v3", "Full-stack Generic")
- Link a resume version to each application
- Dashboard shows response rate per version
- Quick-access download for interview prep
- Storage: Firebase Storage with signed URLs

### F7: Browser Extension (Chrome)
The "one-click capture" that eliminates manual data entry.

**How it works:**
1. User visits a job listing on LinkedIn, Indeed, Glassdoor, or any page
2. Clicks the HireTrack extension icon
3. Extension extracts what it can from the page DOM:
   - Job title, company name, location, salary (if visible), job description
4. Opens a pre-filled popup form for user to review/edit
5. User selects campaign and clicks "Save"
6. Card is created in the "Saved" column of selected campaign

**Supported sites (with dedicated parsers):**
- LinkedIn Jobs
- Indeed
- Glassdoor
- AngelList / Wellfound
- Generic fallback (page title + URL + user fills rest)

**Key design decisions:**
- **No scraping while logged in to user's account** — extension reads visible DOM only
- **Graceful degradation** — if parser can't extract data, opens empty form with URL pre-filled
- **Modular parsers** — each site has its own parser module, updatable independently
- **Offline queue** — if API is unreachable, queues locally and syncs later
- **Duplicate detection** — warns if a similar job URL already exists in the campaign

### F8: Weekly Strategy Digest Email
Automated weekly email that makes users feel coached.

**Email content:**
- Applications this week vs. goal
- New responses received
- Upcoming interviews and deadlines
- Momentum score change (+/- from last week)
- Top action item for next week
- Motivational insight (e.g., "Your response rate is 22% — that's above the industry average of 15%!")

**Implementation:** BullMQ scheduled job → aggregation query → email template (MJML) → Resend API

### F9: Notification Center
In-app notification hub.

- Reminder notifications (follow-ups, interviews, deadlines)
- System notifications (extension sync complete, import done)
- Read/unread state, mark all as read
- Click-through to relevant card
- Bell icon with unread count badge

### F10: Data Management
Production-ready data handling.

- **Import:** CSV upload with column mapping UI (migrate from spreadsheets)
- **Export:** Full campaign data to CSV or PDF report
- **Data deletion:** GDPR-compliant "Delete my account and all data" 
- **Backup:** Manual data export before deletion

---

## Technical Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Next.js App  │  │ Chrome Ext   │  │  PWA Mobile  │  │
│  │  (React 18)   │  │ Manifest V3  │  │  (Same App)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    API LAYER                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │              NestJS REST API                      │   │
│  │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐ │   │
│  │  │  Auth  │ │Campaign│ │  Board  │ │ Analytics│ │   │
│  │  │ Module │ │ Module │ │  Module │ │  Module  │ │   │
│  │  └────────┘ └────────┘ └─────────┘ └──────────┘ │   │
│  │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐ │   │
│  │  │Resume  │ │Reminder│ │  Notif  │ │  Import  │ │   │
│  │  │ Module │ │ Module │ │  Module │ │  Export  │ │   │
│  │  └────────┘ └────────┘ └─────────┘ └──────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────┬───────────────────┬───────────────────────────┘
          │                   │
          ▼                   ▼
┌──────────────────┐  ┌────────────────┐
│   PostgreSQL     │  │     Redis      │
│   (Neon DB)      │  │  (Upstash)     │
│                  │  │ Cache + Queue  │
│  - Users         │  │ - BullMQ jobs  │
│  - Campaigns     │  │ - Session cache│
│  - Applications  │  │ - Rate limits  │
│  - Reminders     │  │               │
│  - Analytics     │  └────────────────┘
└──────────────────┘
          │
┌──────────────────┐  ┌────────────────┐
│ Firebase Storage │  │   Resend API   │
│ - Resumes        │  │ - Digest email │
│ - Attachments    │  │ - Reminders    │
└──────────────────┘  └────────────────┘
```

### Tech Stack (Final)

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR for SEO (landing page), React for app, API routes for BFF |
| **UI Library** | Radix UI + custom CSS | Accessible primitives, full design control |
| **Drag & Drop** | @dnd-kit/core | Best React DnD lib: accessible, performant, maintained |
| **Charts** | Recharts | Composable, React-native, great for dashboards |
| **State** | Zustand + TanStack Query | Zustand for UI state, TanStack for server state/cache |
| **Backend** | NestJS (TypeScript) | Modular, your expertise, production-grade |
| **ORM** | Prisma | Type-safe, great migrations, works with Neon |
| **Database** | PostgreSQL (Neon) | Serverless Postgres, free tier, auto-scaling |
| **Cache/Queue** | Redis (Upstash) + BullMQ | Serverless Redis, scheduled jobs for reminders/digests |
| **Auth** | NextAuth.js v5 | Google + GitHub OAuth, JWT sessions |
| **Email** | Resend + React Email | Modern email API, React-based templates |
| **Storage** | Firebase Storage | Resume/attachment uploads, your existing Firebase expertise |
| **Extension** | Chrome Manifest V3 | Content scripts + popup, TypeScript |
| **Deployment** | Vercel (FE) + Railway (BE) | Optimized for each layer |
| **Monorepo** | Turborepo | Shared types, efficient builds |
| **Testing** | Vitest + Playwright | Unit + E2E |
| **CI/CD** | GitHub Actions | Automated lint → test → build → deploy |

### Monorepo Structure
```
hiretrack/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router pages
│   │   │   ├── (landing)/      # Public landing page (SSR/SEO)
│   │   │   ├── (auth)/         # Login/signup pages
│   │   │   ├── (dashboard)/    # Protected app pages
│   │   │   │   ├── campaigns/
│   │   │   │   ├── board/[id]/
│   │   │   │   ├── analytics/
│   │   │   │   ├── resumes/
│   │   │   │   ├── settings/
│   │   │   │   └── notifications/
│   │   │   └── api/            # BFF API routes
│   │   ├── components/
│   │   │   ├── ui/             # Design system primitives
│   │   │   ├── board/          # Kanban components
│   │   │   ├── analytics/      # Chart components
│   │   │   ├── campaign/       # Campaign components
│   │   │   └── layout/         # Shell, nav, sidebar
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/             # Zustand stores
│   │   └── styles/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── campaign/
│   │   │   ├── application/
│   │   │   ├── board/
│   │   │   ├── reminder/
│   │   │   ├── analytics/
│   │   │   ├── resume/
│   │   │   ├── notification/
│   │   │   ├── import-export/
│   │   │   ├── digest/
│   │   │   ├── common/         # Guards, interceptors, pipes
│   │   │   └── prisma/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── Dockerfile
│   └── extension/              # Chrome extension
│       ├── manifest.json
│       ├── popup/
│       ├── content-scripts/
│       │   ├── parsers/
│       │   │   ├── linkedin.ts
│       │   │   ├── indeed.ts
│       │   │   ├── glassdoor.ts
│       │   │   └── generic.ts
│       │   └── index.ts
│       ├── background/
│       └── shared/
├── packages/
│   ├── shared-types/           # Shared TS types/interfaces
│   ├── ui/                     # Shared design tokens (if needed)
│   └── eslint-config/
├── turbo.json
├── package.json
└── .github/workflows/
```

---

## Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  avatarUrl     String?
  oauthProvider String?   // "google" | "github"
  oauthId       String?
  timezone      String    @default("UTC")
  digestEnabled Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  campaigns      Campaign[]
  resumeVersions ResumeVersion[]
  notifications  Notification[]
  emailTemplates EmailTemplate[]
}

model Campaign {
  id              String   @id @default(cuid())
  userId          String
  name            String
  goal            String?
  targetRole      String?
  salaryMin       Decimal?
  salaryMax       Decimal?
  currency        String   @default("USD")
  startDate       DateTime @default(now())
  targetEndDate   DateTime?
  weeklyGoal      Int      @default(10)
  status          CampaignStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  columns Column[]
  
  @@index([userId])
}

model Column {
  id         String @id @default(cuid())
  campaignId String
  name       String
  color      String @default("#6366f1")
  position   Int
  wipLimit   Int?
  isDefault  Boolean @default(false)
  
  campaign     Campaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  applications Application[]
  
  @@index([campaignId])
}

model Application {
  id              String   @id @default(cuid())
  columnId        String
  companyName     String
  companyLogoUrl  String?
  roleTitle       String
  jobUrl          String?
  jobDescription  String?  // Full JD text (Vault)
  location        String?
  workType        WorkType?
  salaryMin       Decimal?
  salaryMax       Decimal?
  currency        String   @default("USD")
  source          ApplicationSource?
  appliedDate     DateTime?
  priority        Priority @default(MEDIUM)
  resumeVersionId String?
  coverLetter     String?
  position        Int
  isArchived      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  column        Column          @relation(fields: [columnId], references: [id], onDelete: Cascade)
  resumeVersion ResumeVersion?  @relation(fields: [resumeVersionId], references: [id])
  contacts      Contact[]
  notes         Note[]
  tags          ApplicationTag[]
  statusChanges StatusChange[]
  reminders     Reminder[]
  attachments   Attachment[]
  
  @@index([columnId])
  @@index([resumeVersionId])
}

model Contact {
  id            String  @id @default(cuid())
  applicationId String
  name          String
  role          String?
  email         String?
  linkedinUrl   String?
  phone         String?
  notes         String?
  
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model Note {
  id            String   @id @default(cuid())
  applicationId String
  content       String
  type          NoteType @default(GENERAL)
  createdAt     DateTime @default(now())
  
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model Tag {
  id    String @id @default(cuid())
  name  String
  color String @default("#6366f1")
  
  applications ApplicationTag[]
  
  @@unique([name])
}

model ApplicationTag {
  applicationId String
  tagId         String
  
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  tag         Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([applicationId, tagId])
}

model StatusChange {
  id            String   @id @default(cuid())
  applicationId String
  fromColumn    String
  toColumn      String
  changedAt     DateTime @default(now())
  
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  
  @@index([applicationId])
}

model ResumeVersion {
  id        String   @id @default(cuid())
  userId    String
  label     String
  fileUrl   String
  fileName  String
  fileSize  Int
  createdAt DateTime @default(now())
  
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications Application[]
  
  @@index([userId])
}

model Reminder {
  id            String       @id @default(cuid())
  applicationId String?
  userId        String
  message       String
  type          ReminderType
  remindAt      DateTime
  isSent        Boolean      @default(false)
  isDismissed   Boolean      @default(false)
  createdAt     DateTime     @default(now())
  
  application Application? @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  
  @@index([remindAt, isSent])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  type      String
  linkTo    String?  // Deep link within app
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead])
}

model EmailTemplate {
  id       String @id @default(cuid())
  userId   String
  name     String
  subject  String
  body     String
  category String // "follow_up" | "thank_you" | "negotiation"
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Attachment {
  id            String @id @default(cuid())
  applicationId String
  fileName      String
  fileUrl       String
  fileSize      Int
  fileType      String
  createdAt     DateTime @default(now())
  
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

enum CampaignStatus { ACTIVE PAUSED COMPLETED }
enum WorkType { REMOTE HYBRID ONSITE }
enum ApplicationSource { LINKEDIN INDEED GLASSDOOR ANGELLIST COMPANY_SITE REFERRAL RECRUITER OTHER }
enum Priority { HIGH MEDIUM LOW }
enum NoteType { GENERAL INTERVIEW_PREP FEEDBACK POST_INTERVIEW }
enum ReminderType { FOLLOW_UP INTERVIEW_PREP OFFER_DEADLINE STALE_CARD CUSTOM }
```

---

## API Design (Key Endpoints)

### Auth
| Method | Endpoint | Description |
|---|---|---|
| GET | `/auth/google` | Google OAuth redirect |
| GET | `/auth/github` | GitHub OAuth redirect |
| GET | `/auth/callback` | OAuth callback handler |
| POST | `/auth/refresh` | Refresh JWT token |
| DELETE | `/auth/logout` | Invalidate session |

### Campaigns
| Method | Endpoint | Description |
|---|---|---|
| GET | `/campaigns` | List user's campaigns |
| POST | `/campaigns` | Create campaign (auto-creates default columns) |
| PATCH | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign + all data |
| GET | `/campaigns/:id/board` | Full board with columns + cards |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| POST | `/applications` | Create application card |
| PATCH | `/applications/:id` | Update card fields |
| PATCH | `/applications/:id/move` | Move card (column + position) |
| PATCH | `/applications/:id/archive` | Archive/unarchive |
| DELETE | `/applications/:id` | Hard delete |
| GET | `/applications/:id` | Full card detail with relations |
| POST | `/applications/bulk-import` | CSV import |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/funnel?campaignId=` | Conversion funnel data |
| GET | `/analytics/activity?campaignId=` | Weekly activity trend |
| GET | `/analytics/sources?campaignId=` | Source channel performance |
| GET | `/analytics/resumes?campaignId=` | Resume version performance |
| GET | `/analytics/momentum?campaignId=` | Momentum score |
| GET | `/analytics/overview` | Cross-campaign summary |

### Reminders & Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | User's notifications (paginated) |
| PATCH | `/notifications/read` | Mark as read (bulk) |
| POST | `/reminders` | Create custom reminder |
| PATCH | `/reminders/:id/dismiss` | Dismiss reminder |

---

## UI/UX Design System

### Design Tokens
```css
/* Color Palette — Premium Dark Theme */
--bg-primary: hsl(225, 25%, 8%);        /* Deep navy black */
--bg-secondary: hsl(225, 20%, 12%);     /* Card backgrounds */
--bg-tertiary: hsl(225, 18%, 16%);      /* Hover states */
--bg-glass: hsla(225, 20%, 15%, 0.6);   /* Glassmorphism */

--accent-primary: hsl(250, 85%, 65%);   /* Vibrant indigo */
--accent-secondary: hsl(175, 75%, 55%); /* Teal */
--accent-gradient: linear-gradient(135deg, hsl(250,85%,65%), hsl(280,80%,65%));

--text-primary: hsl(0, 0%, 95%);
--text-secondary: hsl(225, 15%, 60%);
--text-muted: hsl(225, 10%, 40%);

--success: hsl(145, 65%, 50%);
--warning: hsl(38, 90%, 55%);
--danger: hsl(0, 75%, 60%);

--border: hsla(225, 20%, 25%, 0.5);
--shadow: 0 8px 32px hsla(225, 50%, 5%, 0.4);

/* Typography */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Spacing scale */
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 20px; --space-6: 24px;
--space-8: 32px; --space-10: 40px; --space-12: 48px;

/* Border radius */
--radius-sm: 6px; --radius-md: 10px;
--radius-lg: 16px; --radius-xl: 24px;

/* Animations */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast: 150ms;
--duration-normal: 250ms;
```

### Key Screens
1. **Landing Page** — Hero with animated board mockup, feature sections, CTA
2. **Dashboard Home** — Campaign cards, momentum score, upcoming deadlines
3. **Board View** — Full Kanban with drag-and-drop
4. **Card Detail** — Slide-out panel with all application info
5. **Analytics** — Data visualization dashboard
6. **Resume Manager** — Upload, label, track performance
7. **Settings** — Profile, notification prefs, data management
8. **Notification Center** — Bell dropdown with grouped notifications

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- Monorepo setup (Turborepo + shared types)
- Next.js app with design system (tokens, primitives, layout shell)
- NestJS API scaffold with Prisma + PostgreSQL
- Auth flow (Google + GitHub OAuth via NextAuth)
- CI/CD pipeline (GitHub Actions → Vercel + Railway)
- Landing page (SSR, SEO-optimized)

### Phase 2: Core Board (Week 2-3)
- Campaign CRUD (create, list, edit, delete)
- Board view with columns
- Application card CRUD
- Drag-and-drop (column-to-column, reorder within column)
- Card detail slide-out panel
- Status change auto-logging
- Tags system
- Notes & contacts per card

### Phase 3: Intelligence Layer (Week 3-4)
- Job Description Vault (store full JD text)
- Smart reminders engine (auto-generated + custom)
- Follow-up email templates (pre-built + custom)
- Notification center (in-app)
- Resume version manager (upload, link, list)

### Phase 4: Analytics & Insights (Week 4-5)
- Conversion funnel chart
- Weekly activity trend
- Source channel performance
- Resume version performance tracking
- Momentum Score calculation + display
- Campaign overview dashboard

### Phase 5: Browser Extension (Week 5-6)
- Manifest V3 setup with TypeScript
- Popup UI (campaign selector, pre-filled form)
- Content scripts with site-specific parsers (LinkedIn, Indeed, Glassdoor)
- Generic fallback parser
- API integration (create card from extension)
- Duplicate detection
- Offline queue + sync

### Phase 6: Polish & Production (Week 6-7)
- Weekly Strategy Digest email (BullMQ + Resend)
- CSV import with column mapping UI
- Data export (CSV + PDF report)
- Account deletion (GDPR)
- PWA manifest + service worker (installable on mobile)
- Dark/light theme toggle
- Comprehensive error handling + loading states
- Rate limiting + input validation
- Performance optimization (lazy loading, virtualization)
- Accessibility audit (keyboard nav, ARIA)

### Phase 7: Testing & Launch (Week 7-8)
- Unit tests (Vitest — services, utils, hooks)
- E2E tests (Playwright — critical flows)
- Security audit (OWASP top 10 checklist)
- Performance testing (Lighthouse > 90)
- Staging deployment + manual QA
- Production deployment
- Chrome Web Store submission (extension)
- Product Hunt launch prep

---

## Deployment Architecture

| Service | Platform | Tier | Why |
|---|---|---|---|
| Frontend | Vercel | Free/Pro | Optimized for Next.js, global CDN |
| Backend API | Railway | Starter ($5) | Docker containers, auto-deploy |
| Database | Neon PostgreSQL | Free | Serverless Postgres, branching |
| Redis | Upstash | Free | Serverless Redis, pay-per-use |
| File Storage | Firebase Storage | Free (5GB) | Your existing Firebase expertise |
| Email | Resend | Free (100/day) | Modern API, React templates |
| Domain | Any registrar | ~$12/yr | hiretrack.app or similar |
| Monitoring | Sentry | Free | Error tracking, performance |
| Analytics | Plausible or PostHog | Free (self) | Privacy-friendly usage analytics |

### CI/CD Pipeline
```
Push to main → GitHub Actions:
  1. Lint (ESLint + Prettier)
  2. Type check (tsc --noEmit)
  3. Unit tests (Vitest)
  4. E2E tests (Playwright)
  5. Build check
  6. Deploy to staging
  7. Smoke tests
  8. Deploy to production (manual approval)
```

---

## Security Checklist (Production)
- [x] JWT tokens with short expiry (15min) + refresh tokens (7 days)
- [x] CORS whitelist (only hiretrack.app domain)
- [x] Rate limiting (express-rate-limit: 100 req/min per user)
- [x] Input validation (class-validator on all DTOs)
- [x] SQL injection prevention (Prisma parameterized queries)
- [x] XSS prevention (React auto-escaping + DOMPurify for rich text)
- [x] CSRF protection (SameSite cookies)
- [x] Helmet.js security headers
- [x] File upload validation (type, size limits)
- [x] Account data isolation (all queries scoped by userId)
- [x] HTTPS everywhere
- [x] Environment variable validation (Zod at startup)
- [x] Dependency audit (npm audit in CI)

---

## Verification Plan

### Automated
- `npm run lint` — zero warnings
- `npm run type-check` — passes
- `vitest run` — all unit tests pass
- `playwright test` — critical E2E flows pass:
  - Sign up → create campaign → add card → drag to next column
  - Upload resume → link to card → check analytics
  - Extension → capture job → verify card created
- Lighthouse audit > 90 (performance, accessibility, best practices, SEO)

### Manual
- Test on Chrome, Firefox, Safari, Edge
- Mobile responsiveness (iPhone SE through iPad Pro)
- Extension on Chrome + Edge
- Invite 3-5 beta testers for real job search usage
- Load test: 1000+ cards on a single board (no lag on drag)

---

## User Review Required

> [!IMPORTANT]
> **Tech stack choice:** I've selected **Next.js (frontend) + NestJS (backend)** as a decoupled monorepo. This means learning/using React instead of Flutter for the web. This showcases your versatility to employers and is the industry standard for web SaaS. If you prefer to stick with Flutter Web, the plan can be adapted — but React is recommended for this project.

> [!IMPORTANT]
> **Hosting costs:** The plan uses services with free/cheap tiers. Total estimated cost: **~$17/month** (Railway $5 + domain $12/yr). Everything else has a free tier sufficient for launch. Acceptable?

> [!IMPORTANT]
> **Browser extension scope:** Building parsers for LinkedIn, Indeed, Glassdoor, and a generic fallback. Should I add any other job sites you frequently use?

## Open Questions

1. **App name confirmed as "HireTrack"?** Or would you prefer another name? (Need to decide before domain purchase)
2. **Do you have a Google Cloud project and GitHub OAuth app set up**, or should the plan include setting those up?
3. **Any specific job sites** you want the extension to support beyond LinkedIn/Indeed/Glassdoor?
4. **Timeline expectation:** The plan targets 7-8 weeks to production. Does this align with your availability?
