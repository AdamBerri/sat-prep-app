# 1600Club - SAT Prep

Join the club. Get the score. A gamified SAT preparation app that makes studying addictive. Built with Next.js, Convex, and Clerk.

## Features

- **Stunning Landing Page** - Nature-inspired design with notebook/grass/barn vibes
- **Google OAuth** - Easy sign-in with Clerk authentication
- **Full SAT Simulation** - 98 questions with proper timing
- **Practice Mode** - Untimed practice at your own pace
- **Smart Progress Tracking** - We remember everything for you
- **Unlimited Questions** - Never run out of practice material
- **Real Scaled Scores** - Get actual SAT score estimates
- **Beautiful Exam UI** - Clean, distraction-free testing experience

## Quick Start

### 1. Install Dependencies

```bash
cd sat-prep-app
npm install
```

### 2. Set Up Clerk (Authentication)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Enable Google OAuth in the "Social Connections" section
4. Copy your API keys

Create a `.env.local` file:

```bash
# Copy from .env.local.example
cp .env.local.example .env.local
```

Then fill in your Clerk keys:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 3. Set Up Convex (Database)

Run Convex in development mode:

```bash
npx convex dev
```

On first run, it will:
1. Ask you to log in (creates free account if needed)
2. Create a new project
3. Add `NEXT_PUBLIC_CONVEX_URL` to your `.env.local`

#### View Local Database

While `npx convex dev` is running, you can view your data in the local dashboard:

**http://127.0.0.1:6790**

This gives you a web UI to browse tables, run queries, and inspect your data.

### 4. Generate Questions

In a new terminal (keep `convex dev` running):

```bash
# Generate 100 reading questions
npm run generate:reading 100

# Generate 50 data questions (charts/graphs/tables)
npm run generate:reading-data 50

# Generate math questions with figures
npm run generate:math
```

See [SEEDING.md](./SEEDING.md) for full documentation on question generation.

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app!

## Project Structure

```
sat-prep-app/
├── convex/                    # Backend
│   ├── schema.ts             # Database schema
│   ├── questions.ts          # Question queries
│   ├── passages.ts           # Passage queries
│   ├── attempts.ts           # Exam attempt management
│   ├── answers.ts            # Answer mutations
│   ├── scores.ts             # Score calculation
│   └── seed.ts               # Database seeding
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout (Clerk + Convex)
│   │   ├── page.tsx          # Main app component
│   │   └── globals.css       # Rustic theme styles
│   ├── components/
│   │   └── LandingPage.tsx   # Marketing landing page
│   ├── lib/
│   │   ├── constants.ts      # SAT config
│   │   └── visitor.ts        # Anonymous user management
│   └── types/
│       └── index.ts          # TypeScript types
├── middleware.ts              # Clerk middleware
├── tailwind.config.js
└── next.config.js
```

## The Landing Page

The landing page includes:

- **Hero Section** - Eye-catching headline with CTA
- **Features Grid** - 6 key benefits
- **Philosophy Section** - "We believe in you" messaging
- **Pricing Comparison** - $240/3mo vs $2000+ tutoring
- **Trust Indicators** - Stars, unlimited questions, etc.

## Theme & Aesthetic

The app uses a rustic notebook/nature theme:

- **Paper tones** - Cream, warm beige
- **Earthy greens** - Grass, forest colors
- **Wood accents** - Barn-inspired browns
- **Notebook styling** - Lined paper effect, margin lines
- **Handwritten fonts** - Caveat for accents

## Available Scripts

```bash
# Development
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run convex       # Start Convex dev server

# Question Generation (see SEEDING.md for details)
npm run generate:reading 100      # Generate 100 reading questions
npm run generate:reading-data 50  # Generate 50 data questions
npm run generate:math             # Generate math questions
npm run generate:clear            # Clear all questions

# Dead Letter Queue (failed generation retry)
npm run dlq:reading:stats         # View reading DLQ statistics
npm run dlq:reading:retry         # Retry failed reading questions
npm run dlq:data:stats            # View data DLQ statistics
npm run dlq:data:retry            # Retry failed data questions

# Official Question Import (from PDFs)
npm run import:pdf                # Import questions from PDF
npm run official:stats            # View import statistics
npm run official:clear            # Clear all imported questions
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Backend**: Convex (real-time database)
- **Auth**: Clerk (Google OAuth)
- **Icons**: Lucide React

## Customization

### Adding More Questions

Edit `convex/seed.ts` to add more question templates, then:

```bash
npx convex run seed:clearDatabase
npx convex run seed:seedDatabase
```

### Changing the Theme

All theme colors are CSS variables in `src/app/globals.css`:

```css
:root {
  --paper-cream: #fdf8f3;
  --grass-medium: #7eb36a;
  --barn-red: #8b3a3a;
  /* etc. */
}
```

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy!

### Deploy Convex

```bash
npx convex deploy
```

---

## AI Question Generation

The app uses AI pipelines to generate unique SAT questions at scale.

### Environment Variables

Set these in Convex Dashboard > Settings > Environment Variables:

- `ANTHROPIC_API_KEY` - For Claude (passage + question generation)
- `GOOGLE_AI_STUDIO_API_KEY` - For Gemini (image generation)

### Quick Start

```bash
npm run generate:reading 100       # 100 reading questions
npm run generate:reading-data 50   # 50 data questions (charts/graphs)
npm run generate:math              # Math questions with figures
```

**See [SEEDING.md](./SEEDING.md) for full documentation** including:
- All question types and options
- Filtering by type
- Generating at scale
- Dead letter queue management
- Cost estimates

### Estimated Costs

| Type | Per Question | 1000 Questions |
|------|--------------|----------------|
| Reading | ~$0.03 | ~$30 |
| Data (with images) | ~$0.04 | ~$40 |
