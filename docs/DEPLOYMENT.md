# The 1600 Club - Deployment Guide

## Overview

This app uses a **3-tier deployment pipeline**:

| Branch | Environment | Domain | Purpose |
|--------|-------------|--------|---------|
| `main` | Development | localhost:3000 | Local dev, base branch for PRs |
| `stage` | Staging | staging.the1600club.com | Testing before prod |
| `prod` | Production | the1600club.com | Live users |

**Services per environment:**
- **Convex**: Separate projects (stage/prod data isolation)
- **Clerk**: Dev instance (stage) / Prod instance (prod)
- **Stripe**: Test mode (stage) / Live mode (prod)
- **Vercel**: Single project, branch-based deployments

---

## Git Workflow

```
main (development)
  │
  ├── feature branches → PR to main
  │
  └── PR to stage ──────→ stage (staging)
                            │
                            └── PR to prod ──→ prod (production)
```

**Daily workflow:**
1. Create feature branch from `main`
2. PR to `main` for code review
3. PR `main` → `stage` to deploy to staging
4. PR `stage` → `prod` to deploy to production

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

You need **separate Convex projects** for staging and production.

### 1a. Create Staging Project

```bash
npx convex login

# Create staging project
npx convex init
# Name it: 1600club-stage
```

Save your staging URL: `https://xxx-stage.convex.cloud`

### 1b. Create Production Project

```bash
npx convex init
# Name it: 1600club-prod
```

Save your production URL: `https://xxx-prod.convex.cloud`

### 1c. Deploy to Each Project

```bash
# Deploy to staging
npx convex deploy --project 1600club-stage

# Deploy to production
npx convex deploy --project 1600club-prod
```

### 1d. Set Convex Environment Variables

In **each** Convex dashboard (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GOOGLE_AI_STUDIO_API_KEY` | Your Google AI Studio key |

---

## Step 2: Set Up Clerk

### 2a. Development/Staging Instance

1. Go to Clerk Dashboard
2. Use the **Development** instance
3. Note the keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_test_...`
   - `CLERK_SECRET_KEY`: `sk_test_...`
4. Add staging domain to allowed origins

### 2b. Production Instance

1. In Clerk Dashboard → Switch to **Production**
2. Complete production setup wizard
3. Note the keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_live_...`
   - `CLERK_SECRET_KEY`: `sk_live_...`
4. Add `the1600club.com` to allowed origins
5. Configure OAuth for production domain

---

## Step 3: Set Up Stripe

### 3a. Test Mode (Staging)

1. Stripe Dashboard → **Test mode** ON
2. Get test keys: `sk_test_...`, `pk_test_...`
3. Webhook URL: `https://staging.the1600club.com/api/webhook/stripe`

### 3b. Live Mode (Production)

1. Stripe Dashboard → **Live mode**
2. Get live keys: `sk_live_...`, `pk_live_...`
3. Webhook URL: `https://the1600club.com/api/webhook/stripe`

Webhook events needed: `checkout.session.completed`, `customer.subscription.*`

---

## Step 4: Deploy to Vercel

### 4a. Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)

### 4b. Configure Production Branch

In Vercel Project Settings → Git:

- **Production Branch**: `prod`

This means:
- Pushes to `prod` → deploys to the1600club.com
- Pushes to `stage` → deploys to staging.the1600club.com
- Pushes to `main` → preview deployments only

### 4c. Configure Domains

In Vercel Project Settings → Domains:

| Domain | Git Branch |
|--------|------------|
| `the1600club.com` | prod |
| `staging.the1600club.com` | stage |

### 4d. Set Environment Variables

**Production environment:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://xxx-prod.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |

**Preview environment (staging):**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://xxx-stage.convex.cloud` |
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
# Start from main
git checkout main

# Create stage branch
git checkout -b stage
git push -u origin stage

# Create prod branch
git checkout -b prod
git push -u origin prod

# Back to main for development
git checkout main
```

---

## Deployment Workflows

### Feature Development

```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "Add my feature"
git push -u origin feature/my-feature

# Create PR to main on GitHub
```

### Deploy to Staging

```bash
# After PR merged to main
git checkout main
git pull origin main

# Create PR: main → stage on GitHub
# Merge PR
# Vercel auto-deploys to staging.the1600club.com
```

Or directly:
```bash
git checkout stage
git merge main
git push origin stage
```

### Deploy to Production

```bash
# After testing on staging
# Create PR: stage → prod on GitHub
# Review and merge
# Vercel auto-deploys to the1600club.com
```

### Convex Changes

```bash
# Deploy schema/function changes
npx convex deploy --project 1600club-stage   # Staging
npx convex deploy --project 1600club-prod    # Production
```

---

## CI/CD Pipeline

GitHub Actions runs on every push and PR:

1. **Lint** - ESLint checks
2. **Type Check** - TypeScript validation
3. **Build** - Next.js build verification
4. **Convex Codegen** - Convex type generation

All checks must pass before merging.

---

## Environment Summary

| | Development | Staging | Production |
|--|-------------|---------|------------|
| **Branch** | main | stage | prod |
| **Domain** | localhost | staging.the1600club.com | the1600club.com |
| **Convex** | local dev | 1600club-stage | 1600club-prod |
| **Clerk** | Dev keys | Dev instance | Prod instance |
| **Stripe** | Test keys | Test mode | Live mode |
| **Deploy** | Manual | Auto on push | Auto on push |

---

## Troubleshooting

### Build Fails

1. Check Vercel build logs
2. Ensure all env vars set for environment
3. Run `npm run build` locally

### Staging Works, Prod Doesn't

1. Verify prod env vars (not test keys)
2. Check Clerk prod instance configured
3. Ensure Stripe in live mode

### Convex Queries Failing

1. Check `NEXT_PUBLIC_CONVEX_URL` correct
2. Verify Convex env vars set
3. Run `npx convex deploy`

### Auth Issues

1. Domain in Clerk allowed origins
2. OAuth configured for domain
3. Correct Clerk keys for environment

---

## Quick Reference

```bash
# Local development
npm run dev                              # Next.js dev server
npm run convex                           # Convex dev server

# Deploy to staging
git checkout stage && git merge main && git push
npx convex deploy --project 1600club-stage

# Deploy to production
# PR: stage → prod on GitHub, then merge
npx convex deploy --project 1600club-prod

# Check status
# Vercel: vercel.com/dashboard
# Convex: dashboard.convex.dev
```
