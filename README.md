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

### 4. Seed the Database

In a new terminal (keep `convex dev` running):

```bash
npx convex run seed:seedDatabase
```

This populates:
- 10 reading passages
- 54 Reading & Writing questions
- 44 Math questions
- Explanations for all questions

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

# Database
npm run seed         # Seed the database
npm run seed:clear   # Clear all database data

# Question Generation
npm run generate:graph                # Generate math graph questions
npm run generate:graph:clear          # Clear existing graph questions
npm run generate:reading-data         # Generate one reading data question (chart/graph/table)
npm run generate:reading-data:batch   # Batch generate reading data questions
npm run generate:reading              # Generate one reading question (passage-based)
npm run generate:reading:batch        # Batch generate reading questions

# Dead Letter Queue - Reading Data (charts/graphs)
npm run dlq:data:stats           # View DLQ statistics
npm run dlq:data:pending         # View pending items
npm run dlq:data:retry           # Retry all pending items

# Dead Letter Queue - Reading Questions (passage-based)
npm run dlq:reading:stats        # View DLQ statistics
npm run dlq:reading:pending      # View pending items
npm run dlq:reading:retry        # Retry all pending items

# Official Question Import (from PDFs)
npm run import:pdf               # Import questions from PDF
npm run official:stats           # View import statistics
npm run official:clear           # Clear all imported questions
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

### Environment Variables (Convex Dashboard)

Set these in Convex Dashboard > Settings > Environment Variables:

- `ANTHROPIC_API_KEY` - For Claude (data + question generation)
- `GOOGLE_AI_STUDIO_API_KEY` - For Gemini (image generation)

### Reading Questions (Passage-Based)

SAT-style reading comprehension with generated passages. Uses **verbalized sampling** to create unique questions.

#### Generate Single Question

```bash
# Random question type and passage type
npm run generate:reading

# Specific question type
npm run generate:reading -- '{"questionType": "central_ideas"}'

# Specific passage type
npm run generate:reading -- '{"passageType": "literary_narrative"}'

# Both specified
npm run generate:reading -- '{"questionType": "inferences", "passageType": "natural_science"}'
```

**Question Types:**
- `central_ideas` - Main point/purpose
- `inferences` - What can be inferred
- `vocabulary_in_context` - Word meaning
- `text_structure` - Paragraph function
- `command_of_evidence` - Which quote supports claim
- `rhetorical_synthesis` - Complete with evidence

**Passage Types:**
- `literary_narrative` - Fiction, memoir
- `social_science` - Psychology, sociology
- `natural_science` - Biology, physics
- `humanities` - History, philosophy

#### Batch Generation

```bash
# Generate 10 random questions
npm run generate:reading:batch -- '{"count": 10}'

# Generate 20 central_ideas questions only
npm run generate:reading:batch -- '{"count": 20, "questionTypes": ["central_ideas"]}'

# Generate 50 science passage questions
npm run generate:reading:batch -- '{"count": 50, "passageTypes": ["natural_science"]}'
```

---

### Reading Data Questions (Charts, Graphs, Tables)

SAT-style reading comprehension questions with visual data. Uses **verbalized sampling** to create unique questions.

#### Pipeline Stages

1. **Sample Parameters** - Randomly select question characteristics
2. **Generate Data** (Claude) - Create realistic dataset
3. **Render Image** (Gemini) - Generate chart/graph/table image
4. **Generate Question** (Claude) - Create question, distractors, explanation
5. **Store** - Save to database

#### Generate Single Question

```bash
# Bar chart question
npm run generate:reading-data -- '{"dataType": "bar_chart"}'

# Line graph question
npm run generate:reading-data -- '{"dataType": "line_graph"}'

# Data table question
npm run generate:reading-data -- '{"dataType": "data_table"}'
```

#### Batch Generation

```bash
# Generate 10 questions (rotates through all data types)
npm run generate:reading-data:batch -- '{"count": 10}'

# Generate 100 bar charts only
npm run generate:reading-data:batch -- '{"count": 100, "dataTypes": ["bar_chart"]}'

# Generate with custom batch ID
npm run generate:reading-data:batch -- '{"count": 50, "batchId": "my-batch"}'
```

#### Generate Thousands

```bash
# Run multiple batches (100 questions each)
for i in {1..10}; do
  npm run generate:reading-data:batch -- '{"count": 100}'
  sleep 60  # Avoid rate limits
done
```

### Dead Letter Queue (DLQ)

Failed generations are saved for retry. Each item tracks which stage failed:
- `data_generation` - Claude data generation failed
- `image_generation` - Gemini image failed
- `question_generation` - Claude question generation failed
- `storage` - Database insert failed

```bash
# Reading Data DLQ (charts/graphs)
npm run dlq:data:stats
npm run dlq:data:pending
npm run dlq:data:retry

# Reading Question DLQ (passage-based)
npm run dlq:reading:stats
npm run dlq:reading:pending
npm run dlq:reading:retry
```

---

## Official Question Import (PDF)

Import questions from College Board SAT practice test PDFs. Uses Claude's vision to extract passages, questions, and answer choices.

### Import from Local PDF

```bash
# Import reading/writing questions
npm run import:pdf -- '{
  "pdfPath": "/path/to/sat-practice-test-1.pdf",
  "pdfName": "SAT Practice Test 1",
  "testNumber": 1,
  "category": "reading_writing"
}'

# Import math questions
npm run import:pdf -- '{
  "pdfPath": "/path/to/sat-practice-test-1-math.pdf",
  "pdfName": "SAT Practice Test 1",
  "testNumber": 1,
  "category": "math"
}'

# With answer key (merges correct answers)
npm run import:pdf -- '{
  "pdfPath": "/path/to/test.pdf",
  "answerKeyPath": "/path/to/answer-key.pdf",
  "pdfName": "SAT Practice Test 1",
  "category": "reading_writing"
}'
```

### View Import Statistics

```bash
# Get counts by category, question type, and source
npm run official:stats

# Clear all imported questions
npm run official:clear
```

### How It Works

1. **PDF Extraction** - Claude reads the PDF and identifies questions
2. **Classification** - Each question is tagged with:
   - Question type (central_ideas, inferences, vocabulary, etc.)
   - Domain and skill
   - Passage type (literary, science, social science, etc.)
3. **Answer Merging** - If answer key provided, correct answers are matched
4. **Deduplication** - Questions already imported are skipped

### Use Cases

- **Few-shot examples** - Imported questions serve as examples for AI generation
- **Quality benchmarks** - Compare generated questions to official ones
- **Pattern analysis** - Study question structures and distractor strategies

### Files

| File | Purpose |
|------|---------|
| **Reading Questions (Passage-Based)** | |
| `convex/readingQuestionGeneration.ts` | Main generation pipeline |
| `convex/readingQuestionTemplates.ts` | Sampling params, distractor strategies |
| `convex/readingQuestionPrompts.ts` | Claude prompts for each question type |
| `convex/readingQuestionDLQ.ts` | Failed generation retry |
| **Reading Data (Charts/Graphs)** | |
| `convex/readingDataGeneration.ts` | Main pipeline |
| `convex/readingDataTemplates.ts` | Sampling params, prompts |
| `convex/readingDataImagePrompts.ts` | Chart prompts |
| `convex/readingDataDLQ.ts` | Failed generation retry |
| **Math Questions** | |
| `convex/graphQuestionTemplates.ts` | Math graph templates |
| `convex/graphImagePipeline.ts` | Math graph pipeline |
| **Official Question Import** | |
| `convex/pdfImport.ts` | PDF extraction with Claude |
| `convex/officialQuestions.ts` | Store/query imported questions |

### Estimated Costs

| Service | Per Question | 1000 Questions |
|---------|--------------|----------------|
| Claude (2 calls) | ~$0.03 | ~$30 |
| Gemini (image) | ~$0.01 | ~$10 |
| **Total** | ~$0.04 | **~$40** |
