# The 1600 Club - Deployment Guide

## Overview

This app uses a **staging → production** deployment pipeline:

| Branch | Environment | Domain | Auto-Deploy |
|--------|-------------|--------|-------------|
| `main` | Staging | staging.the1600club.com | Yes (on push) |
| `production` | Production | the1600club.com | Yes (on merge) |

**Services per environment:**
- **Convex**: Separate projects (staging/production data isolation)
- **Clerk**: Separate instances (dev/production keys)
- **Stripe**: Test mode (staging) / Live mode (production)
- **Vercel**: Single project, branch-based deployments

---

## Prerequisites

- [ ] GitHub repo with code pushed
- [ ] Convex account (convex.dev)
- [ ] Clerk account (clerk.com)
- [ ] Stripe account (stripe.com)
- [ ] Vercel account (vercel.com)
- [ ] Domain: the1600club.com (purchased via Vercel)

---

## Step 1: Create Two Convex Projects

You need **separate Convex projects** for staging and production to isolate data.

### 1a. Create Staging Project

```bash
# In project root
npx convex login

# Create staging project
npx convex init
# When prompted, name it: 1600club-staging
```

Save your staging URL (e.g., `https://xxx-staging.convex.cloud`)

### 1b. Create Production Project

```bash
# Create production project
npx convex init
# When prompted, name it: 1600club-production
```

Save your production URL (e.g., `https://xxx-production.convex.cloud`)

### 1c. Configure convex.json

Create environment-specific config:

```json
{
  "team": "your-team",
  "project": "1600club-staging"
}
```

**Important:** When deploying, specify the project:

```bash
# Deploy to staging
npx convex deploy --project 1600club-staging

# Deploy to production
npx convex deploy --project 1600club-production
```

### 1d. Set Convex Environment Variables

In **each** Convex project dashboard (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GOOGLE_AI_STUDIO_API_KEY` | Your Google AI Studio key |

---

## Step 2: Set Up Clerk (Two Instances)

### 2a. Development/Staging Instance

1. Go to Clerk Dashboard
2. Your default app is the **Development** instance
3. Note the keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_test_...`
   - `CLERK_SECRET_KEY`: `sk_test_...`
4. Configure OAuth (Google) for staging domain

### 2b. Production Instance

1. In Clerk Dashboard → Switch to **Production**
2. Follow the production setup wizard
3. Note the keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_live_...`
   - `CLERK_SECRET_KEY`: `sk_live_...`
4. Add production domain: `the1600club.com`
5. Configure OAuth for production domain

---

## Step 3: Set Up Stripe (Test & Live)

### 3a. Test Mode (Staging)

1. Stripe Dashboard → Ensure **Test mode** toggle is ON
2. Get test keys:
   - `STRIPE_SECRET_KEY`: `sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY`: `pk_test_...`
3. Set up webhook (after Vercel deploy):
   - URL: `https://staging.the1600club.com/api/webhook/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`

### 3b. Live Mode (Production)

1. Stripe Dashboard → Toggle to **Live mode**
2. Get live keys:
   - `STRIPE_SECRET_KEY`: `sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY`: `pk_live_...`
3. Set up webhook:
   - URL: `https://the1600club.com/api/webhook/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`

---

## Step 4: Deploy to Vercel

### 4a. Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)

### 4b. Configure Git Branches

In Vercel Project Settings → Git:

1. **Production Branch**: `production`
2. This means:
   - Pushes to `production` → deploys to the1600club.com
   - Pushes to `main` → deploys to preview URL
   - PRs → get preview deployments

### 4c. Configure Domains

In Vercel Project Settings → Domains:

1. Add `the1600club.com` (production)
2. Add `staging.the1600club.com` (staging)

Configure domain assignments:
- `the1600club.com` → Production (production branch)
- `staging.the1600club.com` → Preview (main branch)

### 4d. Set Environment Variables

In Vercel Project Settings → Environment Variables:

**For Production environment:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://xxx-production.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |

**For Preview environment (staging):**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://xxx-staging.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |

---

## Step 5: Create Git Branches

```bash
# Ensure you're on main
git checkout main

# Create production branch
git checkout -b production
git push -u origin production

# Go back to main for development
git checkout main
```

---

## Deployment Workflow

### Daily Development (Staging)

```bash
# Work on main branch
git checkout main

# Make changes
git add .
git commit -m "Add feature X"
git push origin main

# Vercel auto-deploys to staging.the1600club.com
```

### Deploy to Production

```bash
# Create PR from main → production
# Review changes
# Merge PR

# Vercel auto-deploys to the1600club.com
```

Or via GitHub:
1. Go to your repo on GitHub
2. Click "New pull request"
3. Base: `production` ← Compare: `main`
4. Review and merge
5. Vercel deploys automatically

### Convex Changes

When you update Convex schema or functions:

```bash
# Deploy to staging first
npx convex deploy --project 1600club-staging

# After testing, deploy to production
npx convex deploy --project 1600club-production
```

---

## CI/CD Pipeline

GitHub Actions runs on every push and PR:

1. **Lint** - ESLint checks
2. **Type Check** - TypeScript validation
3. **Build** - Next.js build verification
4. **Convex Codegen** - Convex type generation

All checks must pass before merging to production.

---

## Environment Summary

| Service | Staging | Production |
|---------|---------|------------|
| **Domain** | staging.the1600club.com | the1600club.com |
| **Convex** | 1600club-staging | 1600club-production |
| **Clerk** | Development instance | Production instance |
| **Stripe** | Test mode | Live mode |
| **Branch** | main | production |

---

## Troubleshooting

### Build Fails on Vercel

1. Check build logs in Vercel dashboard
2. Ensure all env vars are set for the correct environment
3. Run `npm run build` locally to reproduce

### Staging Works, Production Doesn't

1. Verify production env vars are set (not test keys)
2. Check Clerk production instance is configured
3. Ensure Stripe is in live mode with correct webhook

### Convex Queries Failing

1. Check `NEXT_PUBLIC_CONVEX_URL` points to correct project
2. Verify Convex project has required env vars
3. Run `npx convex deploy` to sync schema

### Auth Not Working

1. Verify domain is added to Clerk allowed origins
2. Check OAuth providers are configured for the domain
3. Ensure correct Clerk keys for environment

### Webhook Issues

1. Check Stripe dashboard for webhook delivery logs
2. Verify webhook URL matches your domain
3. Ensure webhook secret is correct in env vars

---

## Quick Reference

```bash
# Local development
npm run dev              # Start Next.js
npm run convex           # Start Convex dev server

# Deploy staging
git push origin main                           # Auto-deploys to Vercel
npx convex deploy --project 1600club-staging   # Deploy Convex

# Deploy production
# 1. Create PR: main → production
# 2. Merge PR (Vercel auto-deploys)
npx convex deploy --project 1600club-production  # Deploy Convex

# Check deployment status
# Visit: https://vercel.com/dashboard
# Visit: https://dashboard.convex.dev
```
