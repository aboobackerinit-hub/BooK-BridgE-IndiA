# Deploying BookBridge on Vercel (Frontend + Backend)

Both the React frontend and the FastAPI backend are hosted on the **same Vercel deployment** using Serverless Functions.

## Repository structure
```
/
├── api/
│   └── index.py          ← Vercel Serverless Function (imports FastAPI app)
├── backend/
│   └── server.py         ← Actual FastAPI code (single source of truth)
├── frontend/             ← React app
│   ├── package.json
│   └── src/
├── requirements.txt      ← Python dependencies (Vercel installs these)
├── vercel.json           ← Routing + function config
└── .vercelignore
```

## How routing works
- `https://YOURAPP.vercel.app/api/*`  → `api/index.py` (which loads the FastAPI app from `backend/server.py`)
- Everything else → served from `frontend/build/` (React static bundle)

## First-time setup on Vercel

### 1. Import the GitHub repo into Vercel
- Vercel Dashboard → Add New → Project → import your GitHub repo
- **Framework preset:** `Other` (or leave blank — `vercel.json` overrides)
- **Root directory:** keep as `./` (project root)
- Don't change build/output — `vercel.json` handles it

### 2. Set Environment Variables
Vercel Dashboard → Project → Settings → Environment Variables → add these **exactly**:

| Name | Value | Environments |
|---|---|---|
| `SUPABASE_URL` | `https://fntdyfmgogbzpeesogpq.supabase.co` | Prod + Preview |
| `SUPABASE_ANON_KEY` | (your anon JWT eyJ...) | Prod + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Prod + Preview |
| `JWT_SECRET` | any 32+ char random string | Prod + Preview |
| `ADMIN_EMAIL` | `admin@bookbridge.in` | Prod + Preview |
| `ADMIN_PASSWORD` | `Admin@123` | Prod + Preview |
| `CORS_ORIGINS` | `*` | Prod + Preview |
| `REACT_APP_BACKEND_URL` | (leave blank OR set to same origin, see below) | Prod + Preview |

⚠️ **`REACT_APP_BACKEND_URL` is critical.** Since frontend + backend are on the same domain:
- Option A (recommended): set it to `https://YOURAPP.vercel.app` (whatever your Vercel URL becomes)
- Option B: after first deploy, note the auto-generated URL, then set this env var and redeploy

### 3. Deploy
- Push to `main` branch on GitHub → Vercel auto-deploys
- OR click "Deploy" in Vercel dashboard

### 4. Verify
- Visit `https://YOURAPP.vercel.app` → login page should load with emerald theme
- Login with `aditi@demo.in` / `demo123`
- If the login POST fails, check Vercel → Deployments → Functions logs

## Known limits on Vercel Free tier
- Function execution: 10s (Pro: 60s). We set `maxDuration: 30` — OK on Pro, will be capped at 10s on Hobby.
- Function bundle size: 250 MB unzipped
- Python cold start: ~2-4s (first request slower)
- **No persistent state** in the function — every request is fresh. All data lives in Supabase, so this is fine.

## Local dev (unchanged)
- Backend: `supervisor` runs `/app/backend/server.py` at port 8001 (via Emergent preview)
- Frontend: yarn start at port 3000
- The `api/index.py` file is only used by Vercel — locally the FastAPI app is served directly.

## Rollback
If a deploy breaks, in Vercel → Deployments → click any previous deploy → "Promote to Production".
