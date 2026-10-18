# Deploying LMS App to Vercel

## Prerequisites
- **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you haven't already.
- **Supabase Project**: You need your Supabase URL and Anon Key.

## Step 1: Install Vercel CLI
We have attempted to install the Vercel CLI for you. You can verify it by running:
```bash
vercel --version
```
If it's not installed, run:
```bash
npm install -g vercel
```

## Step 2: Login to Vercel
Run the following command in your terminal:
```bash
vercel login
```
- Select your login method (e.g., Continue with GitHub).
- It will open your browser to authenticate.

## Step 3: Deploy
Run the deployment command:
```bash
vercel
```
Follow the prompts:
1.  **Set up and deploy?** `Y`
2.  **Which scope?** (Select your account)
3.  **Link to existing project?** `N`
4.  **Project name?** `lms-app` (or your preferred name)
5.  **In which directory?** `./` (Just press Enter)
6.  **Want to modify these settings?** `N` (Default settings are fine for Vite)

## Step 4: Configure Environment Variables
After the initial deployment (which might fail or be incomplete without env vars), you need to set the environment variables.

You can do this via the command line or the Vercel Dashboard.

**Via Command Line:**
```bash
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL
# Select 'Production', 'Preview', 'Development' (select all)

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your Supabase Anon Key
# Select 'Production', 'Preview', 'Development' (select all)
```

**Via Dashboard:**
1.  Go to your project on Vercel.
2.  Settings -> Environment Variables.
3.  Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Step 5: Redeploy (if needed)
If you added env vars, redeploy to apply changes:
```bash
vercel --prod
```

## Step 6: Connect Custom Domain
1.  Go to Vercel Dashboard -> Project -> Settings -> Domains.
2.  Add `edustacks.co.in`.
3.  Follow the DNS configuration instructions provided by Vercel (add A record and CNAME record in GoDaddy).

## Troubleshooting
- If build fails, check the logs in Vercel Dashboard.
- Ensure all dependencies are in `package.json`.
