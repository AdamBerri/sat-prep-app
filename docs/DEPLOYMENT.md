# The 1600 Club - Deployment Guide

## Overview

This app uses a **2-tier deployment pipeline**:

| Branch | Environment | Domain | Purpose |
|--------|-------------|--------|---------|
| `main` | Development | localhost:3000 | Local dev, base branch for PRs |
| `prod` | Production | the1600club.com | Live users |

**Services per environment:**
- **Convex**: Separate project for production (data isolation)
- **Clerk**: Dev instance (local) / Prod instance (prod)
- **Stripe**: Test mode (local) / Live mode (prod)
- **Vercel**: Single project, branch-based deployments

---

## Git Workflow

```
main (development)
  │
  ├── feature branches → PR to main
  │
  └── PR to prod ──────→ prod (production)
```

**Daily workflow:**
1. Create feature branch from `main`
2. PR to `main` for code review
3. PR `main` → `prod` to deploy to production

---

## Prerequisites

- [ ] GitHub repo with code pushed
- [ ] Convex account (convex.dev)
- [ ] Clerk account (clerk.com)
- [ ] Stripe account (stripe.com)
- [ ] Vercel account (vercel.com)
- [ ] Domain: the1600club.com (purchased via Vercel)

---

## Step 1: Set Up Convex Production Project

```bash
npx convex login

# Create production project
npx convex init
# Name it: 1600club-prod
```

Save your production URL: `https://xxx-prod.convex.cloud`

### Deploy to Production

```bash
npx convex deploy --project 1600club-prod
```

### Set Convex Environment Variables

In the Convex dashboard (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GOOGLE_AI_STUDIO_API_KEY` | Your Google AI Studio key |

---

## Step 2: Set Up Clerk

### Development Instance (Local)

1. Go to Clerk Dashboard
2. Use the **Development** instance for local dev
3. Note the keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_test_...`
   - `CLERK_SECRET_KEY`: `sk_test_...`

### Production Instance

1. In Clerk Dashboard → Switch to **Production**
2. Complete production setup wizard
3. Note the keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_live_...`
   - `CLERK_SECRET_KEY`: `sk_live_...`
4. Add `the1600club.com` to allowed origins
5. Configure OAuth for production domain

---

## Step 3: Set Up Stripe

### Test Mode (Local Development)

1. Stripe Dashboard → **Test mode** ON
2. Get test keys: `sk_test_...`, `pk_test_...`

### Live Mode (Production)

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
- Pushes to `main` → preview deployments only

### 4c. Configure Domains

In Vercel Project Settings → Domains:

| Domain | Git Branch |
|--------|------------|
| `the1600club.com` | prod |

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

---

## Step 5: Create Git Branches

```bash
# Start from main
git checkout main

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

### Deploy to Production

```bash
# After PR merged to main
git checkout main
git pull origin main

# Create PR: main → prod on GitHub
# Review and merge
# Vercel auto-deploys to the1600club.com
```

Or directly:
```bash
git checkout prod
git merge main
git push origin prod
```

### Convex Changes

```bash
# Deploy schema/function changes to production
npx convex deploy --project 1600club-prod
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

| | Development | Production |
|--|-------------|------------|
| **Branch** | main | prod |
| **Domain** | localhost | the1600club.com |
| **Convex** | local dev | 1600club-prod |
| **Clerk** | Dev keys | Prod instance |
| **Stripe** | Test keys | Live mode |
| **Deploy** | Manual | Auto on push |

---

## Troubleshooting

### Build Fails

1. Check Vercel build logs
2. Ensure all env vars set for environment
3. Run `npm run build` locally

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

# Deploy to production
# PR: main → prod on GitHub, then merge
npx convex deploy --project 1600club-prod

# Check status
# Vercel: vercel.com/dashboard
# Convex: dashboard.convex.dev
```
