# 🎤 Hackathon Presentation — Goal Setting & Tracking Portal

## Slide Deck Outline (10 slides, ~5 minutes)

---

### Slide 1 — Title
**Goal Setting & Tracking Portal**
Enterprise Performance Management — Built in 24 hours
[Your Team Name] · [Hackathon Name] · [Date]

---

### Slide 2 — The Problem (30 seconds)
**"97% of organizations use spreadsheets for goal tracking"**

Pain points:
- ❌ No real-time visibility for leadership
- ❌ No standardized weightage or progress formulas
- ❌ Zero audit trail for compliance
- ❌ Manual approval bottlenecks via email
- ❌ HR compiles 200 Excel sheets manually every quarter

---

### Slide 3 — Our Solution (30 seconds)
**A structured, role-aware, auditable web application**

Three roles. One workflow. Full transparency.

[Show architecture diagram]

---

### Slide 4 — Key Features (45 seconds)

| Feature | Details |
|---|---|
| 🎯 Smart Goal Creation | 8-goal limit, 10% min, 100% total enforced |
| ✅ Approval Workflow | Draft → Submit → Approve/Rework → Lock |
| 📊 Progress Tracking | 6 UoM formulas, Q1–Q4 quarterly updates |
| 💬 Manager Check-ins | Inline comments per goal per quarter |
| 🔒 Row Level Security | Zero data leakage between employees |
| 📋 Full Audit Trail | Every change logged with before/after diff |
| 📥 CSV Export | One-click bulk report for HR |
| 📈 Analytics Dashboard | Department-level charts, status breakdown |

---

### Slide 5 — Live Demo (2 minutes)

**Demo flow:**

1. **Employee** (`employee@demo.com`)
   - Show pre-approved goal sheet with 5 goals at 100% weightage
   - Show Q1 + Q2 quarterly progress filled in
   - Show rework feedback from manager

2. **Manager** (`manager@demo.com`)
   - Show pending submission from emp2
   - Click Approve → instant status change
   - Show check-ins tab with quarterly comments

3. **Admin** (`admin@demo.com`)
   - Show dashboard with 4 employees, breakdown by status
   - Lock an approved sheet
   - Click "Export CSV" → download
   - Open Audit Logs → show before/after diff on a change

---

### Slide 6 — Business Rules Enforced (30 seconds)

The system enforces rules **at three layers**:
1. **Frontend** — Zod validation, form guards, disabled buttons
2. **Server Actions** — Business logic, weightage checks
3. **Database** — Triggers, RLS policies, constraints

> "No employee can submit a sheet where goals don't total exactly 100%. Period."

---

### Slide 7 — Architecture (30 seconds)

```
Browser (Next.js 15) 
    ↓ Server Actions + RSC
Vercel (App Router)
    ↓ Supabase JS SDK
Supabase (PostgreSQL + Auth + RLS)
```

- **Zero API routes** — Server Actions do everything
- **RLS** — Data isolation without a single line of app code
- **Audit triggers** — Automatic logging via PostgreSQL functions
- **Deployment** — One `vercel --prod` command

---

### Slide 8 — Tech Stack (20 seconds)

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js 15 + TypeScript | Server components, type safety |
| Styling | Tailwind + Lucide | Fast, professional, consistent |
| Charts | Recharts | Composable, responsive |
| Backend | Supabase | Auth + DB + RLS in one platform |
| Validation | Zod + React Hook Form | Schema-first, zero runtime errors |
| Deploy | Vercel | Zero-config, instant |

---

### Slide 9 — What Makes This Hackathon-Worthy (30 seconds)

**Beyond CRUD:**
- Progress calculation varies by KPI type (6 formulas)
- Weighted progress scoring across all goals
- Full before/after audit diff viewer
- Role-based data isolation via database RLS
- Mobile-responsive sidebar with role-aware navigation
- Demo credentials with one-click autofill

**Cost: $0** — Runs entirely on free tiers

---

### Slide 10 — Roadmap (10 seconds)

What comes next (post-hackathon):
- Microsoft Entra ID / SSO
- Email notifications (Resend)
- Goal templates library
- AI-powered goal suggestions
- Power BI / Tableau integration

**Demo credentials on screen:**
- admin@demo.com / Demo@1234
- manager@demo.com / Demo@1234
- employee@demo.com / Demo@1234

---

## Judge Talking Points

### If asked: "Why Next.js Server Actions instead of REST API?"
> "Server Actions eliminate the client-server round trip for mutations. Less code, fewer attack surfaces, and type-safe end-to-end without generating API clients. For a 24-hour build, this is a significant productivity multiplier."

### If asked: "How is security handled?"
> "Supabase Row Level Security means even if someone bypasses our app entirely and calls the database API directly, they can only see their own data. Employees can't see other employees' goals — not because the app blocks it, but because the database policy rejects the query at the row level."

### If asked: "How does progress calculation work?"
> "Different KPIs need different formulas. Customer satisfaction score — higher is better, so it's actual/target × 100. Defect rate — lower is better, so target/actual × 100. Zero-based goals like certifications are binary. Timeline goals check if you finished before deadline. The system applies the right formula automatically based on the UoM type selected when the goal was created."

### If asked: "What would you do differently with more time?"
> "Email notifications when a sheet is submitted or approved, bulk shared goal creation, and a mobile app for managers to do quick check-ins on the go. The architecture already supports all of this — it's additive work."

### If asked: "How does audit logging work?"
> "PostgreSQL triggers fire on every INSERT, UPDATE, DELETE on goal sheets, goals, and quarterly updates. The trigger captures the actor's user ID from Supabase auth context, the before and after JSON of the entire row, and timestamps it. The admin sees a filterable table with expandable before/after diffs. This is compliance-grade logging with zero app code."

---

## 2-Minute Demo Script (Verbatim)

> "Let me show you the full lifecycle in 2 minutes."

> "I'll start as an employee. [Login as employee@demo.com] You can see my goal sheet for this financial year. I have 5 goals across different thrust areas — Revenue Growth, Customer Success, Process Excellence — totaling exactly 100% weightage. The system enforces this; you literally cannot submit without it."

> "I've updated Q1 and Q2 progress. [Expand a goal] This goal targets 20% ARR growth. I achieved 18% in Q2 — the system calculates 90% progress automatically using the higher-is-better formula. My manager left feedback that I'm on track."

> "Now let's switch to the manager view. [Login as manager@demo.com] I can see my entire team. Dev Patel submitted his goals 2 hours ago. I can approve right here — [click Approve] — done. Or I can drill into the details. [Click review] I see all his goals, add a comment, and if something's wrong, send it back for rework with a note."

> "Finally, admin. [Login as admin@demo.com] I see the full org: 1 pending, 1 approved. I can lock the approved sheet so nothing changes. One click exports everything to CSV for payroll integration. And the audit log — [open audit logs] — every single change, who made it, when, exactly what changed. [Expand a diff] Before and after."

> "Built in 24 hours. Zero dollars to run. Ready for production."
