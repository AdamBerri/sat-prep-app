# SAT Prep App - Vercel Deployment Guide

## Prerequisites

- [ ] GitHub repo with your code pushed
- [ ] Convex account (convex.dev)
- [ ] Clerk account (clerk.com)
- [ ] Stripe account (stripe.com)
- [ ] Vercel account (vercel.com)

---

## Step 1: Deploy Convex Backend

Your backend needs to be live before the frontend.

```bash
# Login to Convex
npx convex login

# Deploy to production
npx convex deploy
```

After deployment, you'll get a production URL like:
```
https://your-project-123.convex.cloud
```

**Set Convex Environment Variables** (in Convex Dashboard > Settings > Environment Variables):
- `ANTHROPIC_API_KEY` - For AI question generation
- `GOOGLE_AI_STUDIO_API_KEY` - For graph/chart image generation

---

## Step 2: Configure Clerk for Production

1. Go to **Clerk Dashboard** → your app
2. Switch to **Production** instance (or create one)
3. Note your production keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)
4. Configure OAuth providers (Google, etc.) for your production domain

---

## Step 3: Configure Stripe for Production

1. Go to **Stripe Dashboard**
2. Toggle to **Live mode** (top right)
3. Get your live API key: `sk_live_...`
4. Set up webhook endpoint (after Vercel deploy):
   - URL: `https://yourdomain.com/api/webhook/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`

---

## Step 4: Deploy to Vercel

### 4a. Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework Preset: **Next.js** (auto-detected)
4. Root Directory: `./` (default)

### 4b. Set Environment Variables

Add these in Vercel's project settings:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://your-project-123.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |

### 4c. Deploy

Click **Deploy** and wait for the build to complete.

---

## Step 5: Buy Domain on Vercel

1. Go to your project in Vercel
2. **Settings** → **Domains**
3. Click **Buy** and search for your domain
4. Complete purchase (~$20/year for .com)
5. Domain is automatically configured - no DNS setup needed

---

## Step 6: Update External Services

After your domain is live, update these services:

### Clerk
- Add production domain to **Allowed Origins**
- Update OAuth redirect URLs

### Stripe
- Add webhook endpoint: `https://yourdomain.com/api/webhook/stripe`
- Update any hardcoded URLs in checkout sessions

### Convex
- Add production domain to CORS allowed origins (if required)

---

## Step 7: Verify Everything Works

- [ ] Homepage loads
- [ ] Sign up/sign in works
- [ ] Dashboard loads after auth
- [ ] Questions load from Convex
- [ ] Stripe checkout initiates
- [ ] PWA installs correctly (test on mobile)

---

## Ongoing Deployments

Vercel auto-deploys on every push to `main`:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Vercel deploys automatically
```

For Convex schema/function changes:
```bash
npx convex deploy
```

---

## Troubleshooting

### Build fails
- Check Vercel build logs
- Ensure all env vars are set
- Run `npm run build` locally first

### Auth not working
- Verify Clerk keys are for production (not test)
- Check domain is in Clerk allowed origins

### Convex queries failing
- Ensure `NEXT_PUBLIC_CONVEX_URL` points to production
- Check Convex dashboard for function errors

### Stripe webhooks failing
- Verify webhook secret matches
- Check webhook endpoint URL is correct
- View webhook logs in Stripe dashboard
