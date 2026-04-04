# Vercel Deployment

## Quick Deploy

### Option 1: Click Deploy Button
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnatalyly029%2Ftravel-app

### Option 2: Manual Steps
1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Paste: https://github.com/natalyly029/travel-app
4. Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL=https://ssqifnxhbywabvglnppj.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Supabase API]
   - SUPABASE_SERVICE_ROLE_KEY=[from Supabase API]
   - NEXT_PUBLIC_APP_NAME=Travel App
5. Click Deploy

### API Keys
Get from: https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/settings/api

---

After deployment, your production URL will be:
https://travel-app-[random].vercel.app
