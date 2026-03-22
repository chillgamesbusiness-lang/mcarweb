# External Setup Runbook – Session 2 Prerequisites

**Target state by end of this runbook:**
- ✅ Supabase project created + migrations live
- ✅ First admin user created
- ✅ `.env.local` populated
- ✅ `npm run dev` works with login functional
- ✅ Inspector / Admin role-based routing tested

**cd "c:\Users\xxxsa\Desktop\mcarweb\app" ; vercel deploy --prod 2>&1**

---

## 0. Local Prerequisites (5 mins)

### Node.js version

Check your Node version:
```bash
node --version
```

For this project: **Node 18+** (Next.js 16 requirement)

If you're below 18, install the latest LTS from **nodejs.org**.

---

### `.env.local` file

Already created at `app/.env.local` with placeholder values. Verify it exists:

```bash
cd C:\Users\xxxsa\Desktop\mcarweb\app
cat .env.local
```

Expected output:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
...
```

> All values start as placeholders. Fill them in as you complete each step below.

---

## 1. Supabase (40 mins)

### 1a. Create a Supabase project (10 mins)

1. Go to **supabase.com**
2. Sign up (free tier) or log in
3. **New Project**
   - Organization: (default is fine)
   - Project name: `mcarweb`
   - Password: (save this, you'll need it to reset)
   - Region: Closest to you (US-East / EU-West / Asia-Pacific)
4. Wait for provisioning (~2 mins)

---

### 1b. Retrieve API keys (2 mins)

Once your project dashboard loads:

1. Go to **Settings** (gear icon, bottom-left) → **API**
2. Under **Project API keys**:
   - Copy **`Project URL`** → update `.env.local` `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **`anon public` key** → update `.env.local` `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **`service_role` key** → update `.env.local` `SUPABASE_SERVICE_ROLE_KEY`

Example `.env.local` after this step:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

### 1c. Run database migrations (20 mins)

All SQL is in **[MIGRATIONS_PLAN.md](../MIGRATIONS_PLAN.md)** — run top to bottom.

1. In Supabase dashboard, go to **SQL Editor** (top-left)
2. Click **New query** (or paste into the editor)
3. Copy **Step 1 — Enums** SQL block and run it
4. Copy **Step 2a — `users` table** and run
5. Continue through **Step 2g** (`audit_log`)
6. Now run **Step 3 — Indexes**
7. Run **Step 4a — Enable RLS**
8. Create the helper function (**Step 4b**)
9. Apply all RLS policies (**Step 4c–4i**)

**Check:** After Step 4, go to **Authentication** (left sidebar) and verify the database is present.

---

### 1d. Create the photo storage bucket (3 mins)

1. Go to **Storage** (left sidebar)
2. **Create new bucket**
   - Bucket name: `inspection-photos`
   - Privacy: **Private** (uncheck "Public bucket")
3. Click **Create bucket**

**Check:** Bucket appears in the list as private.

---

## 2. Supabase Auth — First Admin User (10 mins)

### 2a. Create an auth user

1. Go to **Authentication** (left sidebar) → **Users**
2. **Invite user**
   - Email: `admin@example.com` (or your email)
   - Click **Send invite**
3. You'll get an invite email — **click the link**
4. Set your password (anything safe — you'll use this to log in)
5. Return to Supabase dashboard

---

### 2b. Manually insert into `users` table

The auth user is created, but the `users` table row must be added manually (RLS blocks service role inserts for now).

1. Go to **SQL Editor** → **New query**
2. Paste and run:

```sql
INSERT INTO users (id, name, email, role, is_active, created_at)
SELECT 
  id,
  raw_user_meta_data->>'name' AS name,
  email,
  'admin' AS role,
  true,
  now()
FROM auth.users
WHERE email = 'admin@example.com'
AND id NOT IN (SELECT id FROM users);
```

**Check:** Go to **Table editor** → `users` → verify your row is there with `role = 'admin'`.

---

## 3. Update `.env.local` (2 mins)

All other env vars are optional for now (rate limit, bot protection, email, reg lookup). You can test the app without them.

Your `.env.local` should now look like:

```
# Supabase (populated)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Reg Lookup (optional for now)
REG_LOOKUP_API_KEY=
REG_LOOKUP_API_URL=

# Resend (optional for now)
RESEND_API_KEY=
RESEND_FROM_ADDRESS=

# Upstash Redis (optional for now)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare Turnstile (optional for now)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Offer Session Token Signing (auto-derives from Supabase key if not set)
OFFER_SESSION_SECRET=
```

Save the file.

---

## 4. Start the dev server & test (5 mins)

```bash
cd C:\Users\xxxsa\Desktop\mcarweb\app
npm run dev
```

Expected output:
```
  ▲ Next.js 16.x.x
  - Local:        http://localhost:3000
```

---

### 4a. Test unauthenticated access

1. Open **http://localhost:3000**
2. You should be redirected to **http://localhost:3000/login**
3. Verify you see the login form

---

### 4b. Test admin login

1. Email: `admin@example.com`
2. Password: (the password you set in step 2a)
3. Click **Sign in**
4. You should be redirected to **http://localhost:3000/admin**
5. Verify the dashboard loads and shows "Dashboard" heading

---

### 4c. Test sidebar navigation

Click the links in the sidebar:
- ✅ `/admin` (dashboard)
- ✅ `/admin/leads`
- ✅ `/admin/calendar`
- ✅ `/admin/settings`

All should load without errors.

---

### 4d. Test sign out

1. Scroll to bottom of sidebar
2. Click **Sign out**
3. You should be redirected to `/login`

---

### 4e. Test role enforcement

1. Try navigating directly to **http://localhost:3000/inspector** while logged in as admin
2. You should be **bounced back to `/admin`**

---

## 5. Optional: Create an Inspector user (5 mins)

Repeat **Step 2a–2b**, but with:
- Email: `inspector@example.com`
- In SQL insert, set `role = 'inspector'` instead of `'admin'`

Test login with inspector account → should land on `/inspector` with empty assignments list.

---

## ✅ Success Criteria

By end of this runbook:

- [ ] Supabase project created
- [ ] All migrations run (8 step blocks)
- [ ] `inspection-photos` bucket created
- [ ] Admin auth user created + `users` row inserted
- [ ] `.env.local` populated with Supabase keys
- [ ] `npm run dev` runs cleanly
- [ ] Login works with admin@example.com
- [ ] `/admin` dashboard loads
- [ ] Sidebar navigation works
- [ ] Sign out works
- [ ] Role enforcement works (admin can't see `/inspector`)

---

## Troubleshooting

### "Cannot read property 'role' of undefined"
→ Admin user exists in `auth.users` but not in `users` table. Run the SQL insert again.

### "Invalid API key"
→ Check `.env.local` has exactly the right URL and keys (no extra spaces). Restart dev server after updating `.env.local`.

### Middleware redirects to login forever
→ Likely an auth session issue. Try clearing cookies (`DevTools → Application → Cookies → delete localhost cookies`) and log in again.

### "Table leads does not exist"
→ Migrations didn't run. Check Supabase SQL Editor for errors and re-run from the start.

---

## Next: Session 2

Once this runbook is complete:
- ✅ Public funnel wiring (`/offer/*` pages + lead submission)
- ✅ Inspector inspection submission + photo upload
- ✅ Admin lead detail form actions (status updates, assign inspector)
