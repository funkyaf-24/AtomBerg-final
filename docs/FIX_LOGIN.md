# Login Fix — Root Cause Analysis & Resolution

## Root Causes Found

### 1. Email Confirmation Not Set (Most Likely Culprit)
Supabase requires `email_confirmed_at` to be set in `auth.users` before
`signInWithPassword()` succeeds. Users created via the Supabase dashboard
(Authentication → Users → Add user) are **not** automatically confirmed unless
you tick "Auto Confirm User". Without confirmation, every login returns
`"Email not confirmed"` — which the old code was swallowing and surfacing as
the generic "Invalid email or password" message.

**Fix:** `database/patch_fix_auth.sql` step 1 confirms all existing users.

---

### 2. `vercel.json` Used Broken Secret References
The old `vercel.json` contained:
```json
"env": {
  "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
}
```
`@supabase_url` is a Vercel CLI secret reference. It **only** works if you've
run `vercel secrets add supabase_url <value>` via the CLI. If you set env vars
in the Vercel Dashboard (Project → Settings → Environment Variables), this
reference resolves to an empty string, meaning `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are blank in production — so every Supabase
call silently fails.

**Fix:** Removed the `env` block from `vercel.json`. Set env vars directly in
the Vercel Dashboard.

---

### 3. `next.config.js` — Missing Vercel Origin
`allowedOrigins` only listed `localhost:3000` and `NEXT_PUBLIC_APP_URL`.
Vercel preview deployments use dynamic `*.vercel.app` URLs. Any server action
called from a preview URL would get a 403 CSRF rejection, silently failing the
login.

**Fix:** Added `'*.vercel.app'` to `allowedOrigins`.

---

### 4. Middleware Cookie Refresh
The old middleware reconstructed `supabaseResponse = NextResponse.next({ request })`
inside `setAll()` but **after** losing the original cookie updates. This meant
the refreshed session token was not always propagated to the browser, causing
intermittent logged-out states.

**Fix:** Rewrote middleware following the exact Supabase SSR pattern —
write cookies to both `request` and then a freshly-built `supabaseResponse`.

---

### 5. Login Page Used Browser Client Directly
The old `login/page.tsx` called `supabase.auth.signInWithPassword()` directly
from the browser client. While this works, it bypasses the server action path
and can cause cookie-setting timing issues in SSR. Switching to the server
action ensures cookies are set server-side before any redirect.

---

## Deployment Checklist

### Step 1 — Run the SQL patch in Supabase
1. Go to **Supabase Dashboard → SQL Editor**
2. Paste the contents of `database/patch_fix_auth.sql` and run it
3. Verify the output shows all users with `is_confirmed = true`

### Step 2 — Set Environment Variables in Vercel
Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**
and add these (for all environments: Production, Preview, Development):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key from Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role key — mark as Secret) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

> Get URL and keys from: **Supabase → Project Settings → API**

### Step 3 — Disable Email Confirmation (for demo/testing)
In **Supabase Dashboard → Authentication → Providers → Email**:
- Toggle **"Confirm email"** to **OFF**

This prevents future users from being blocked by email confirmation.

### Step 4 — Redeploy on Vercel
After setting env vars, trigger a new deployment:
- Push this commit to your repo, OR
- Go to Vercel → Deployments → Redeploy

### Step 5 — Test Login
Try these credentials at your Vercel URL:
- `admin@demo.com` / `Demo@1234` → Admin dashboard
- `manager@demo.com` / `Demo@1234` → Manager dashboard
- `employee@demo.com` / `Demo@1234` → Employee dashboard
- `indulkarshreeyash@gmail.com` / `Demo@1234` → Admin dashboard

---

## Reset a User's Password (if needed)
If a user was created with a different password, reset it in:
**Supabase Dashboard → Authentication → Users → click user → Reset password**

Or via SQL (bcrypt hash of `Demo@1234`):
```sql
UPDATE auth.users
SET encrypted_password = crypt('Demo@1234', gen_salt('bf'))
WHERE email = 'indulkarshreeyash@gmail.com';
```
