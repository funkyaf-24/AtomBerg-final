# 🚀 Deployment Guide — Goal Setting & Tracking Portal

Complete step-by-step guide to go from zero to a live, production application.

---

## Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free)
- A [Vercel](https://vercel.com) account (free)
- A [GitHub](https://github.com) account (for Vercel deploy)

---

## Step 1 — Supabase Project Setup

### 1.1 Create project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose organization, set name: `goal-portal`
4. Set a strong database password (save it!)
5. Choose region closest to your users
6. Click **Create new project** (takes ~2 minutes)

### 1.2 Run the schema
1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste the entire contents of `database/schema.sql`
4. Click **Run** (Ctrl+Enter)
5. Verify: click **Table Editor** — you should see 7 tables

### 1.3 Create demo users
1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add user** → **Create new user** for each:

| Email | Password | Notes |
|---|---|---|
| admin@demo.com | Demo@1234 | Admin/HR role |
| manager@demo.com | Demo@1234 | Manager role |
| employee@demo.com | Demo@1234 | Employee (approved sheet) |
| emp2@demo.com | Demo@1234 | Employee (submitted sheet) |

3. For each user, check **Auto Confirm User** checkbox

### 1.4 Run seed data
1. Back in **SQL Editor**, create another **New query**
2. Paste the contents of `database/seed.sql`
3. Click **Run**
4. Verify: in **Table Editor** → `profiles` — you should see all 4 users with roles

### 1.5 Copy API keys
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (long JWT string)

---

## Step 2 — Local Development

```bash
# 1. Clone or extract the project
cd goal-portal

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Edit .env.local with your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 5. Run development server
npm run dev

# 6. Open http://localhost:3000
# Login with: employee@demo.com / Demo@1234
```

---

## Step 3 — Vercel Deployment

### Option A: Deploy via GitHub (Recommended)

1. Push your project to a GitHub repository:
```bash
git init
git add .
git commit -m "Initial commit: Goal Setting & Tracking Portal"
git remote add origin https://github.com/yourusername/goal-portal.git
git push -u origin main
```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Wait ~2 minutes for build to complete
7. Your app is live at `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

---

## Step 4 — Post-Deployment Checks

### Functional checklist
- [ ] Login page loads at `/auth/login`
- [ ] Employee demo login works and routes to `/employee/dashboard`
- [ ] Manager demo login works and routes to `/manager/dashboard`
- [ ] Admin demo login works and routes to `/admin/dashboard`
- [ ] Goal creation form validates correctly
- [ ] Submit enforces 100% weightage rule
- [ ] Manager can approve a submitted sheet
- [ ] Quarterly updates save correctly
- [ ] CSV export downloads
- [ ] Audit logs show entries

### Supabase RLS check
Run this in SQL Editor to verify RLS is active:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All tables should show rowsecurity = true
```

---

## Step 5 — Custom Domain (Optional)

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g., `goals.yourcompany.com`)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable with new domain

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Optional | Your deployed app URL |

---

## Troubleshooting

### "Failed to fetch" on login
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct (no trailing slash)
- Verify Supabase project is not paused (free tier pauses after 1 week inactivity)

### RLS blocking data
- Verify seed.sql ran correctly and `manager_id` is set for employees
- Check `profiles` table has correct `role` values

### Vercel build fails
- Ensure `tsconfig.json` is present
- Check all imports use `@/` path alias correctly
- Run `npm run type-check` locally first

### Users not seeing data
- Supabase free tier: wake up paused project at supabase.com/dashboard
- Check `is_active = true` in profiles table

---

## Free Tier Limits

| Service | Free Limit | Notes |
|---|---|---|
| Supabase DB | 500 MB | More than enough for 1000+ employees |
| Supabase Auth | 50,000 MAU | Monthly active users |
| Supabase API | Unlimited requests | No cap |
| Vercel Bandwidth | 100 GB/month | Typical usage: <1 GB |
| Vercel Deployments | Unlimited | No cap |
| **Total Cost** | **$0** | Zero cost for demo/MVP |
