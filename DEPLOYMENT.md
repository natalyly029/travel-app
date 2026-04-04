# Travel App - Deployment Guide

## Prerequisites

- GitHub account connected to Vercel
- Supabase project (already set up: `ssqifnxhbywabvglnppj`)
- Vercel account

---

## Step 1: Prepare Supabase Credentials

### Get API Keys from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/settings/api)
2. Under **Project Settings → API**, copy:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL (e.g., `https://ssqifnxhbywabvglnppj.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key (public, safe for frontend)
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (secret, keep secure)

### Verify Local Setup

```bash
# Test with .env.local (should already be set up)
npm run build
npm run dev

# Open http://localhost:3000
```

---

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel

# When prompted:
# - Select "Y" to create new project
# - Project name: travel-app
# - Framework: Next.js
# - Root directory: ./
# - Build command: npm run build
# - Output directory: .next
```

### Option B: Using GitHub Integration

1. Push code to GitHub:
   ```bash
   git push origin main
   ```

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)

3. Click **Add New... → Project**

4. Select **Import Git Repository**
   - Search for `travel-app`
   - Select `natalyly029/travel-app`

5. Configure Project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`

6. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ssqifnxhbywabvglnppj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Supabase API settings]
   SUPABASE_SERVICE_ROLE_KEY=[from Supabase API settings]
   NEXT_PUBLIC_APP_NAME=Travel App
   ```

7. Click **Deploy**

---

## Step 3: Verify Production Build

After deployment completes:

1. Open Vercel deployment URL (e.g., `https://travel-app-xyz.vercel.app`)

2. Test critical flows:
   - ✅ Home page loads
   - ✅ Create trip form works
   - ✅ Trip detail page loads
   - ✅ Schedule editor responds
   - ✅ Payment tracking saves data
   - ✅ Settlement calculation works
   - ✅ Member invite link (`/trips/join/:token`) works

3. Check Network tab in DevTools:
   - API responses: `/api/trips/*` endpoints return 200/201
   - Supabase: Confirm table queries complete successfully

---

## Step 4: Set Up Database URL (Optional)

If you need server-side database access:

1. Get connection string from Supabase:
   - Settings → Database → Connection string
   - Copy **PostgreSQL** connection string

2. Add to Vercel environment variables:
   ```
   DATABASE_URL=postgresql://...
   ```

---

## Production Checklist

- [ ] Supabase credentials set in Vercel env vars
- [ ] Build completes successfully
- [ ] All pages load without errors
- [ ] API endpoints respond
- [ ] Database queries work
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Analytics enabled (optional)

---

## Rollback

If deployment fails:

1. Go to Vercel Dashboard → travel-app
2. Click **Deployments**
3. Find previous successful deployment
4. Click **Redeploy** or **Promote to Production**

---

## Troubleshooting

### "Cannot find module '@/types'"
- Ensure `tsconfig.json` includes path alias
- Rebuild with `npm run build`

### "Supabase connection failed"
- Check environment variables in Vercel
- Verify API keys are correct (no extra spaces)
- Ensure Supabase project is active

### "Database error: RLS policy"
- Check Supabase RLS policies are enabled
- Verify `is_public` flag on trips table
- Test with query: `SELECT * FROM trips WHERE is_public = true;`

### Build fails with "Type error"
- Run locally: `npm run build`
- Fix type errors before pushing
- Push to GitHub → Vercel redeploys automatically

---

## Monitoring

After deployment:

1. **Vercel Analytics**: Dashboard → Analytics tab
2. **Supabase Logs**: Dashboard → Logs
3. **Errors**: Enable Sentry (optional)

---

## Scaling Tips

- **Database**: Supabase auto-scales (no action needed)
- **Frontend**: Vercel CDN distribution is automatic
- **Images**: Consider Vercel Image Optimization for future features
- **API Rate Limiting**: Currently: 10 reqs/min per IP (configurable)

---

## Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
