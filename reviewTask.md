# Question Review Task

Fast batch review system for verifying AI-generated SAT questions.

## Quick Start

```bash
# Review up to 25 pending questions (default)
npm run review

# Review up to 50 pending questions
npm run review 50

# Check current review statistics
npm run review:stats
```

## Prerequisites

1. **Convex dev server running:**
   ```bash
   npx convex dev
   ```

2. **Environment variables set** (in `.env.local` or exported):
   - `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL
   - `ANTHROPIC_API_KEY` - For Claude reviews

## What It Does

The review script:
1. Fetches pending questions from Convex (single query)
2. Pre-fetches images for questions with figures (parallel)
3. Sends to Claude for review (5 concurrent calls)
4. Bulk updates database with results (single mutation)

## Performance

| Metric | Old Sequential | New Batch |
|--------|----------------|-----------|
| 25 questions | ~8-10 minutes | ~30-60 seconds |
| Claude calls | 1 at a time | 5 concurrent |
| DB updates | 2-3 per question | 1 bulk call |

## Review Checks

Claude verifies each question for:
- **Answer correctness** - Is the marked answer actually correct?
- **Distractor quality** - Are wrong answers plausibly wrong?
- **Question clarity** - Is the stem clear and unambiguous?
- **Image verification** - For questions with figures:
  - No duplicate labels (A, B, C points)
  - Graph matches equation/values
  - Image is clear and complete

## Review Statuses

| Status | Description | Shown to Students? |
|--------|-------------|-------------------|
| `pending` | Awaiting review | No |
| `verified` | Passed review | Yes |
| `needs_revision` | Issues found | No |
| `rejected` | Failed review | No |

## Files

```
scripts/review-questions.mjs     # Local batch review script
convex/questionReviewBatch.ts    # Batch queries + bulk mutations
convex/questionReview.ts         # Original sequential review (legacy)
```

## Troubleshooting

### "CONVEX_URL environment variable is required"
Export your Convex URL:
```bash
export CONVEX_URL="https://your-deployment.convex.cloud"
```
Or add to `.env.local`:
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Rate limiting
The script handles rate limits automatically with 60-second backoff. If you hit limits frequently, reduce concurrent reviews by editing `CONCURRENT_REVIEWS` in `scripts/review-questions.mjs`.

### Some questions failed
Failed questions are logged at the end. Re-run `npm run review` to retry them.
