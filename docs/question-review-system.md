# Question Review & Verification System

This document describes the question review and verification system that ensures AI-generated SAT questions are accurate before being shown to students.

## Overview

The system implements a two-stage pipeline:

1. **Generation Stage**: Questions are created by AI with `reviewStatus: "pending"`
2. **Review Stage**: A separate LLM review process validates questions before they're shown to students
3. **Ongoing Monitoring**: Student performance is tracked to catch problematic questions post-verification

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Generate     │────▶│     Review      │────▶│  Show to        │
│    Question     │     │   (LLM Check)   │     │  Students       │
│ status: pending │     │ status: verified│     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   Performance   │
                                                │   Monitoring    │
                                                │  (Error Rates)  │
                                                └─────────────────┘
```

## Review Status Flow

Questions can have the following `reviewStatus` values:

| Status | Description | Shown to Students? |
|--------|-------------|-------------------|
| `pending` | Generated, awaiting review | No |
| `verified` | Passed review, ready for use | Yes |
| `needs_revision` | Review found issues requiring manual fix | No |
| `rejected` | Failed review, should not be used | No |
| `flagged_high_error` | Was verified but students are getting it wrong too often | No (pending re-review) |

### Status Transitions

```
                    ┌──────────────┐
                    │   pending    │
                    └──────┬───────┘
                           │
                    LLM Review
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   verified    │  │needs_revision │  │   rejected    │
└───────┬───────┘  └───────────────┘  └───────────────┘
        │
        │ High error rate detected (>70% wrong after 30+ attempts)
        ▼
┌───────────────────────┐
│ flagged_high_error    │ ──▶ Re-review
└───────────────────────┘
```

## Database Schema

### Fields Added to `questions` Table

```typescript
// Review status (gates visibility to students)
reviewStatus: v.optional(v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("needs_revision"),
  v.literal("rejected"),
  v.literal("flagged_high_error")
)),

// Timestamp of last review
lastReviewedAt: v.optional(v.number()),

// Metadata from the review process
reviewMetadata: v.optional(v.object({
  reviewVersion: v.string(),           // Version of review prompt/system
  answerValidated: v.boolean(),        // Was the answer confirmed correct?
  originalCorrectAnswer: v.optional(v.string()), // If answer was changed
  confidenceScore: v.number(),         // LLM's confidence (0-1)
  reviewNotes: v.optional(v.string()), // Notes for human review
})),
```

### New Table: `questionPerformanceStats`

Tracks how students perform on each question:

```typescript
questionPerformanceStats: defineTable({
  questionId: v.id("questions"),
  totalAttempts: v.number(),
  correctAttempts: v.number(),
  errorRate: v.number(),              // 1 - (correct/total)
  answerDistribution: v.object({      // How many chose each answer
    A: v.number(),
    B: v.number(),
    C: v.number(),
    D: v.number(),
  }),
  mostCommonWrongAnswer: v.optional(v.string()),
  flaggedForReview: v.boolean(),      // Auto-flagged for high error rate
  flagReason: v.optional(v.string()),
  lastUpdatedAt: v.number(),
})
```

### New Table: `questionReviewDLQ`

Dead letter queue for failed review attempts:

```typescript
questionReviewDLQ: defineTable({
  questionId: v.id("questions"),
  reviewType: v.union(
    v.literal("initial_verification"),
    v.literal("high_error_rate_recheck")
  ),
  error: v.string(),
  retryCount: v.number(),
  maxRetries: v.number(),
  lastAttemptAt: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("retrying"),
    v.literal("succeeded"),
    v.literal("failed_permanently")
  ),
  createdAt: v.number(),
})
```

## File Structure

```
convex/
├── questionReview.ts           # LLM review actions (Node.js runtime)
├── questionReviewMutations.ts  # Database mutations and queries
├── questionPerformance.ts      # Student performance tracking
├── agentQuestions.ts           # Modified to set reviewStatus: "pending"
├── endless.ts                  # Modified to filter verified questions
└── answers.ts                  # Modified to record performance stats
```

## How It Works

### 1. Question Generation

When a question is generated via `createAgentQuestion` or `createAgentQuestionInternal`, it's automatically created with `reviewStatus: "pending"`:

```typescript
// In convex/agentQuestions.ts
const questionId = await ctx.db.insert("questions", {
  // ... other fields
  reviewStatus: "pending",  // Questions start as pending
});
```

### 2. Question Filtering (Visibility)

In `endless.ts`, questions are filtered before being shown to students:

```typescript
// Only show verified questions (or official CollegeBoard questions)
allQuestions = allQuestions.filter((q) => {
  // Official questions are always allowed
  if (q.source?.type === "official_collegeboard" ||
      q.source?.type === "official_practice_test") {
    return true;
  }
  // Agent-generated questions must be verified
  if (q.source?.type === "agent_generated") {
    return q.reviewStatus === "verified";
  }
  // Default: allow (legacy/seeded questions)
  return true;
});
```

### 3. LLM Review Process

The review system uses Claude to verify each question:

```typescript
// Review a single question
await ctx.runAction(internal.questionReview.reviewSingleQuestion, {
  questionId: "...",
  reviewType: "initial_verification",
});

// Batch review multiple questions
await ctx.runAction(internal.questionReview.reviewUnverifiedQuestions, {
  limit: 10,
  category: "reading_writing",  // Optional filter
  prioritizeGraphing: true,     // Review graphing questions first
});
```

#### What the Review Checks

1. **Answer Validation**: Is the marked correct answer actually correct?
2. **Distractor Quality**: Are wrong answers plausibly wrong?
3. **Question Clarity**: Is the question unambiguous?

#### What the Review Produces

- **Verification**: Confirms or corrects the answer
- **Explanations**: Why the correct answer is right
- **Wrong Answer Explanations**: Why each wrong answer is wrong
- **Common Mistakes**: "Did you choose X because you..." prompts

### 4. Performance Tracking

Every time a student answers a question, performance is recorded:

```typescript
// Called automatically after each answer
await ctx.scheduler.runAfter(0, internal.questionPerformance.recordQuestionAttempt, {
  questionId: args.questionId,
  selectedAnswer: args.selectedAnswer,
  isCorrect,
});
```

#### Auto-Flagging

Questions are automatically flagged when:
- **Error rate > 70%** (students get it wrong most of the time)
- **AND 30+ attempts** (enough data to be statistically meaningful)

When flagged:
1. Question's `reviewStatus` changes to `flagged_high_error`
2. Question is removed from student visibility
3. Question is queued for re-review

## Running Reviews

### Via Convex Dashboard

```bash
# Review up to 10 pending questions
npx convex run questionReview:reviewUnverifiedQuestions '{"limit": 10}'

# Review only reading/writing questions
npx convex run questionReview:reviewUnverifiedQuestions '{"limit": 10, "category": "reading_writing"}'

# Review a specific question
npx convex run questionReview:reviewSingleQuestion '{"questionId": "...", "reviewType": "initial_verification"}'
```

### Programmatically

```typescript
// From another action
await ctx.scheduler.runAfter(0, internal.questionReview.reviewUnverifiedQuestions, {
  limit: 10,
});
```

## Querying Review Status

### Get Unreviewed Question Count

```typescript
const counts = await ctx.runQuery(api.questionReviewMutations.getUnreviewedQuestionCount, {
  category: "math",  // Optional
});

// Returns:
{
  total: 100,
  pending: 45,
  verified: 50,
  needsRevision: 3,
  rejected: 1,
  flaggedHighError: 1,
}
```

### Get Problematic Questions (High Error Rate)

```typescript
const problematic = await ctx.runQuery(api.questionPerformance.getProblematicQuestions, {
  minAttempts: 30,     // Default: 30
  minErrorRate: 0.7,   // Default: 0.7 (70%)
  limit: 50,
});
```

### Get Quality Dashboard Stats

```typescript
const dashboard = await ctx.runQuery(api.questionPerformance.getQuestionQualityDashboard, {});

// Returns:
{
  totalQuestions: 500,
  questionsWithStats: 200,
  byReviewStatus: {
    pending: 50,
    verified: 400,
    needs_revision: 10,
    rejected: 5,
    flagged_high_error: 2,
    unset: 33,
  },
  averageErrorRate: 0.35,
  flaggedCount: 5,
  worstPerformingQuestionIds: [...],
  totalAttempts: 10000,
}
```

## Re-Review Prevention

Questions are not re-reviewed unnecessarily:

```typescript
function shouldReviewQuestion(question): boolean {
  // Never reviewed = always review
  if (!question.lastReviewedAt) return true;

  // Already verified and within 7-day cooldown = skip
  if (question.reviewStatus === "verified") {
    const COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - question.lastReviewedAt < COOLDOWN) return false;
  }

  // Flagged for high error rate = always re-review
  if (question.reviewStatus === "flagged_high_error") return true;

  // Needs revision = waiting for manual fix
  if (question.reviewStatus === "needs_revision") return false;

  // Rejected = don't review again
  if (question.reviewStatus === "rejected") return false;

  return false;
}
```

## Common Mistakes Feature

The review generates "common mistakes" that help students understand why they might have chosen a wrong answer:

```typescript
// Example common mistakes
commonMistakes: [
  {
    reason: "misread_question",
    description: "Did you choose B because you missed the word 'except' in the question?",
    relatedSkill: "careful_reading"
  },
  {
    reason: "partial_answer",
    description: "Did you choose C because it's partially correct but misses the main point?",
    relatedSkill: "comprehensive_analysis"
  }
]
```

These are stored in the `explanations` table and can be shown to students after they answer incorrectly.

## Special Handling for Graphing Questions

Graphing questions (questions with figures/charts) are prioritized for review because they're more likely to have generation issues:

```typescript
// Prioritize graphing questions in batch review
await ctx.runAction(internal.questionReview.reviewUnverifiedQuestions, {
  prioritizeGraphing: true,  // Default is true
});
```

The review prompt includes special warnings for graphing questions:

```
WARNING: This question includes a figure/graph. Pay special attention to:
- Whether the marked answer aligns with what the figure should show
- Potential mismatches between question and visual representation
```

## Admin Operations

### Clear a Question's Flag

After manually reviewing a flagged question:

```typescript
await ctx.runMutation(api.questionPerformance.clearQuestionFlag, {
  questionId: "...",
});
```

### Reset Performance Stats

After fixing a question, reset its stats:

```typescript
await ctx.runMutation(api.questionPerformance.resetQuestionStats, {
  questionId: "...",
});
```

## Troubleshooting

### Questions Not Showing to Students

1. Check `reviewStatus` - must be `"verified"`
2. Check `source.type` - official questions bypass review
3. Run the review process if status is `"pending"`

### Review Failing

1. Check `questionReviewDLQ` table for errors
2. Verify `ANTHROPIC_API_KEY` is set in environment
3. Check Convex logs for detailed error messages

### High False Positive Rate on Flagging

Adjust thresholds in `questionPerformance.ts`:

```typescript
const ERROR_RATE_THRESHOLDS = {
  FLAG_FOR_REVIEW: 0.7,      // Increase if too many false positives
  MIN_ATTEMPTS_FOR_FLAG: 30, // Increase if flagging too early
};
```

## Future Improvements

- [ ] Admin UI for reviewing flagged questions
- [ ] Scheduled cron job for automatic batch reviews
- [ ] Manual override to mark questions as verified without LLM review
- [ ] Analytics dashboard for review metrics
- [ ] Email alerts for high error rate questions
