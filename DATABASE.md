# Database Schema Guide

Quick reference for all tables in the Convex database.

## Where Are The Questions?

**Main questions table:** `questions`

Each question links to other tables:
```
questions
    ├── answerOptions (A, B, C, D choices)
    ├── explanations (why answer is correct)
    └── passages (reading passage, if applicable)
```

---

## Core Content Tables

### `questions`
The main questions table. Every practice question lives here.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ID | Unique identifier |
| `type` | `"multiple_choice"` or `"grid_in"` | Question format |
| `category` | `"reading_writing"` or `"math"` | SAT section |
| `domain` | string | e.g., "information_and_ideas", "algebra" |
| `skill` | string | e.g., "inferences", "linear_equations" |
| `difficulty` | number | Legacy 1-3 scale |
| `overallDifficulty` | number | Precision 0.0-1.0 scale |
| `prompt` | string | The question text |
| `correctAnswer` | string | "A", "B", "C", or "D" |
| `passageId` | ID? | Links to `passages` table (for reading questions) |
| `figure` | object? | Image info for graph/chart questions |
| `tags` | string[] | Searchable tags |

**To query:** `npx convex data questions`

---

### `answerOptions`
The A, B, C, D choices for each question.

| Field | Type | Description |
|-------|------|-------------|
| `questionId` | ID | Links to `questions` |
| `key` | string | "A", "B", "C", or "D" |
| `content` | string | The answer text |
| `order` | number | Display order (0-3) |

**To query:** `npx convex data answerOptions`

**Find options for a specific question:**
```bash
# In the dashboard, filter by questionId
```

---

### `passages`
Reading passages for reading/writing questions.

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | The passage text |
| `title` | string? | Passage title |
| `author` | string? | Author name |
| `passageType` | string? | "literary_narrative", "social_science", etc. |
| `complexity` | number? | 0.0-1.0 difficulty |
| `generationType` | string? | "official", "agent_generated", "seeded" |

**To query:** `npx convex data passages`

---

### `explanations`
Why the correct answer is correct, and why wrong answers are wrong.

| Field | Type | Description |
|-------|------|-------------|
| `questionId` | ID | Links to `questions` |
| `correctExplanation` | string | Why the answer is right |
| `wrongAnswerExplanations` | object? | `{A: "...", B: "...", ...}` |
| `commonMistakes` | array? | Typical errors students make |

**To query:** `npx convex data explanations`

---

### `images`
Stored images (for charts, graphs, geometric figures).

| Field | Type | Description |
|-------|------|-------------|
| `storageId` | ID | Convex storage reference |
| `width` | number | Image width |
| `height` | number | Image height |
| `altText` | string | Description of the image |

**To query:** `npx convex data images`

---

## Official Questions (Imported from PDFs)

### `officialQuestions`
Questions imported from College Board PDFs. Separate from `questions` table.

| Field | Type | Description |
|-------|------|-------------|
| `source` | object | `{pdfName, testNumber, sectionNumber, questionNumber}` |
| `category` | string | "reading_writing" or "math" |
| `questionType` | string | "central_ideas", "inferences", etc. |
| `passage` | object? | Embedded passage (not linked) |
| `questionStem` | string | The question text |
| `choices` | object | `{A: "...", B: "...", C: "...", D: "..."}` |
| `correctAnswer` | string | The correct choice |
| `convertedToQuestionId` | ID? | If converted to playable question |

**To query:** `npx convex data officialQuestions`

---

## User Progress Tables

### `examAttempts`
A user's test-taking session.

| Field | Type | Description |
|-------|------|-------------|
| `visitorId` | string | Anonymous user ID |
| `mode` | string | "sat", "practice", or "endless" |
| `status` | string | "in_progress", "completed", etc. |
| `currentQuestionIndex` | number | Where they are in the test |

---

### `userAnswers`
Individual answers submitted by users.

| Field | Type | Description |
|-------|------|-------------|
| `attemptId` | ID | Links to `examAttempts` |
| `questionId` | ID | Links to `questions` |
| `selectedAnswer` | string? | "A", "B", "C", or "D" |
| `isCorrect` | boolean? | Whether answer was right |
| `timeSpentMs` | number | Time on this question |

---

### `scoreReports`
Final scores after completing an exam.

| Field | Type | Description |
|-------|------|-------------|
| `attemptId` | ID | Links to `examAttempts` |
| `mathScaled` | number | 200-800 math score |
| `readingWritingScaled` | number | 200-800 R&W score |
| `totalScaled` | number | 400-1600 total score |
| `domainScores` | array | Breakdown by domain |
| `skillScores` | array | Breakdown by skill |

---

## Endless Mode Tables

### `endlessSession`
Tracks endless practice mode state.

| Field | Type | Description |
|-------|------|-------------|
| `visitorId` | string | User ID |
| `currentStreak` | number | Consecutive correct |
| `bestStreak` | number | All-time best |
| `questionsAnswered` | number | Total in session |
| `questionIdsAnswered` | ID[] | Avoid repeats |

---

### `skillMastery`
Tracks mastery level per skill.

| Field | Type | Description |
|-------|------|-------------|
| `visitorId` | string | User ID |
| `skill` | string | e.g., "inferences" |
| `masteryLevel` | string | "novice" → "expert" |
| `masteryPoints` | number | 0-1000 |

---

### `questionReviewSchedule`
Spaced repetition scheduling (SM-2 algorithm).

| Field | Type | Description |
|-------|------|-------------|
| `visitorId` | string | User ID |
| `questionId` | ID | Question to review |
| `nextReviewAt` | number | When to show again |
| `easeFactor` | number | How easy (2.5 default) |
| `interval` | number | Days between reviews |

---

## Generation & Quality Tables

### `questionGenerationBatches`
Tracks AI question generation jobs.

| Field | Type | Description |
|-------|------|-------------|
| `batchId` | string | Unique batch ID |
| `status` | string | "pending", "completed", "failed" |
| `targetCategory` | string | What to generate |
| `questionsGenerated` | number | How many succeeded |
| `questionIds` | ID[] | Generated question IDs |

---

### `readingDataDLQ` / `readingQuestionDLQ` / `imageGenerationDLQ`
Dead letter queues for failed generation attempts. Items here can be retried.

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "pending", "succeeded", "failed_permanently" |
| `error` | string | What went wrong |
| `errorStage` | string | Where it failed |
| `retryCount` | number | How many retries |

---

### `difficultyCalibration`
Tracks predicted vs actual difficulty based on user performance.

| Field | Type | Description |
|-------|------|-------------|
| `questionId` | ID | The question |
| `predictedDifficulty` | number | What we estimated |
| `observedDifficulty` | number | Actual from user data |
| `sampleSize` | number | How many attempts |

---

## Business Tables

### `subscriptions`
User subscription status.

### `pdfTests` / `pdfPurchases`
Downloadable PDF test products.

### `tutors` / `tutoringSlots` / `tutoringBookings`
Tutoring session scheduling.

---

## Quick Reference: Finding Stuff

| I want to see... | Table | Command |
|------------------|-------|---------|
| All questions | `questions` | `npx convex data questions` |
| Answer choices | `answerOptions` | `npx convex data answerOptions` |
| Reading passages | `passages` | `npx convex data passages` |
| Explanations | `explanations` | `npx convex data explanations` |
| Official CB questions | `officialQuestions` | `npx convex data officialQuestions` |
| User scores | `scoreReports` | `npx convex data scoreReports` |
| Failed generations | `readingQuestionDLQ` | `npx convex data readingQuestionDLQ` |

---

## Table Relationships Diagram

```
                    ┌─────────────┐
                    │  passages   │
                    └──────┬──────┘
                           │ passageId
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│answerOptions│◄────│  questions  │────►│explanations │
└─────────────┘     └──────┬──────┘     └─────────────┘
   questionId              │                questionId
                           │ figure.imageId
                           ▼
                    ┌─────────────┐
                    │   images    │
                    └─────────────┘

User Flow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│examAttempts │────►│ userAnswers │────►│scoreReports │
└─────────────┘     └─────────────┘     └─────────────┘
   attemptId           attemptId           attemptId
```
