# 🎯 Goal Setting & Tracking Portal

Enterprise-grade goal management and performance tracking web application built for hackathons and production use.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Deployment | Vercel |
| Validation | Zod + React Hook Form |
| Dates | date-fns |
| CSV Export | Built-in (no library needed) |

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| **Employee** | Create goals, submit sheet, update quarterly progress, view comments |
| **Manager** | Review team submissions, approve/reject, add comments, quarterly check-ins |
| **Admin/HR** | Full access, lock/unlock sheets, shared goals, CSV reports, audit logs |

---

## ⚡ Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd goal-portal
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `database/schema.sql`
3. Then run `database/seed.sql` (after creating demo users in Auth)

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in your Supabase URL and anon key
```

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🗄️ Database Setup

### Run schema
In Supabase SQL Editor, paste and run `database/schema.sql`

### Create demo users
In Supabase Auth dashboard → Add user:
- `admin@demo.com` / `Demo@1234`
- `manager@demo.com` / `Demo@1234`
- `employee@demo.com` / `Demo@1234`
- `emp2@demo.com` / `Demo@1234`

### Run seed data
After creating users, run `database/seed.sql` in SQL Editor.

---

## 🏗️ Project Structure

```
goal-portal/
├── app/                          # Next.js App Router pages
│   ├── auth/login/               # Login page
│   ├── employee/dashboard/       # Employee dashboard
│   ├── manager/
│   │   ├── dashboard/            # Manager team overview
│   │   └── review/[sheetId]/     # Sheet review page
│   └── admin/
│       ├── dashboard/            # Admin overview
│       ├── audit-logs/           # Audit log viewer
│       └── reports/              # Analytics + CSV export
│
├── components/
│   ├── layout/Sidebar.tsx        # Role-aware sidebar nav
│   ├── goals/
│   │   ├── GoalForm.tsx          # Goal creation/editing form
│   │   ├── GoalCard.tsx          # Goal display with quarterly data
│   │   ├── QuarterlyUpdateForm.tsx # Progress update modal
│   │   └── EmployeeDashboardContent.tsx
│   ├── manager/
│   │   ├── ManagerDashboardContent.tsx
│   │   └── SheetReviewContent.tsx
│   └── admin/
│       ├── AdminDashboardContent.tsx
│       ├── AuditLogsContent.tsx
│       └── ReportsContent.tsx
│
├── actions/                      # Next.js Server Actions
│   ├── goals.ts                  # Goal CRUD + submit
│   ├── manager.ts                # Approve, rework, comments
│   └── admin.ts                  # Quarterly updates, lock/unlock, export
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── utils.ts                  # Progress calc, CSV, dates
│   └── validations.ts            # Zod schemas
│
├── types/index.ts                # All TypeScript types
├── middleware.ts                 # Auth + role routing
├── database/
│   ├── schema.sql                # Complete DB schema
│   └── seed.sql                  # Demo data
└── .env.example                  # Environment variables template
```

---

## 📋 Business Rules

- **Max 8 goals** per employee per financial year
- **Min 10% weightage** per goal
- **Total weightage must = 100%** before submission
- **Workflow**: draft → submitted → approved → locked
- **Rework path**: submitted → rework → draft (employee revises)
- **Quarterly updates**: Q1, Q2, Q3, Q4 with progress calculation by UoM type

### Progress Formulas

| UoM | Formula |
|---|---|
| Numeric/% Higher is Better | `(Actual / Target) × 100` |
| Numeric/% Lower is Better | `(Target / Actual) × 100` |
| Zero-Based | `100% if Actual = 0, else 0%` |
| Timeline | `100% if completed on or before deadline` |

---

## 🚢 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## 🔐 Row Level Security

All data access is secured via Supabase RLS:

- **Employees** can only see and edit their own goal sheets
- **Managers** can see all direct reports' data
- **Admins** have full access to all data
- **Audit logs** are admin-only

---

## 📊 Features Checklist

### Must-Have (Implemented ✅)
- [x] Email/password authentication
- [x] Role-based routing (employee / manager / admin)
- [x] Goal creation with all UoM types
- [x] Weightage validation (10% min, 100% total)
- [x] Max 8 goals enforcement
- [x] Submit → Approve / Rework workflow
- [x] Manager review screen with comments
- [x] Quarterly updates (Q1–Q4)
- [x] Progress calculation by UoM formula
- [x] Admin dashboard with lock/unlock
- [x] Audit logs with diff viewer
- [x] CSV export (per-sheet and bulk)
- [x] Analytics charts (Recharts)
- [x] Responsive design (mobile + desktop)

### Bonus Features
- [x] Shared goal assignments (schema + actions)
- [x] Department analytics charts
- [x] Audit log diff viewer (before/after JSON)
- [x] Demo credential quick-fill on login

---

## 🎤 Demo Script (Hackathon)

1. **Login as Employee** (`employee@demo.com`) → Show approved goal sheet with Q1/Q2 updates
2. **Login as Manager** (`manager@demo.com`) → Show pending review from emp2, demonstrate approve/rework
3. **Login as Admin** (`admin@demo.com`) → Show dashboard stats, lock a sheet, export CSV, view audit logs

**Key talking points:**
- Enforces 100% weightage rule automatically
- Progress formulas match different KPI types (not one-size-fits-all)
- Full audit trail for compliance
- RLS ensures data isolation without app-level code
- Zero-config deployment on Vercel

---

## 💰 Cost

- **Supabase Free Tier**: 500MB DB, 50,000 MAU, unlimited API calls
- **Vercel Free Tier**: Unlimited deployments, 100GB bandwidth
- **Total for demo / MVP: $0**
