# SAT Prep App - Developer Guide

## Project Overview

This is an AI-powered SAT question generator with a full-stack application for students to practice. The system has two main components:

1. **Question Generation Pipeline** - Uses Claude to generate high-quality SAT questions across all domains (Reading, Writing, Math)
2. **Frontend/Backend Application** - Next.js frontend with Convex backend where students practice questions

**Critical Workflow**: Generated questions must be reviewed before appearing in the frontend. Users cannot see unverified questions - we can't let students practice with potentially incorrect questions.

## Question Review Pipeline

Questions go through a review process before becoming available to users:

```
QUESTION LIFECYCLE:
===================

Generated → pending_review → [Review Script] → verified/needs_revision/rejected
                                                      ↓
                                              Only "verified" questions
                                              appear in practice mode
```

### Review Script (`scripts/review-questions.mjs`)

A batch review script that uses Claude to validate questions outside of Convex (to avoid timeout limits).

**Usage:**
```bash
npm run review              # Review up to 25 pending questions
npm run review 50           # Review up to 50 pending questions
npm run review:all          # Review ALL pending questions in batches
```

**What it does:**
- Fetches pending questions from Convex
- Runs parallel Claude calls (5 concurrent) to validate each question
- For questions with figures/charts, uses multimodal verification
- Checks: answer correctness, distractor quality, question clarity, image accuracy
- Can auto-correct wrong answers if confidence is high
- Bulk updates the database with review results

**Review statuses:**
- `verified` - Question is correct and ready for users
- `needs_revision` - Issues found, needs manual fix
- `rejected` - Question is fundamentally flawed

**Environment variables required:**
- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL`
- `ANTHROPIC_API_KEY`

## Passage Storage Architecture

### Overview Diagram (LLM-Friendly)

```
QUESTION TYPES AND THEIR PASSAGE STORAGE:
=========================================

┌─────────────────────────────────────────────────────────────────────────┐
│                         QUESTIONS TABLE                                  │
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │ question record  │                                                   │
│  │                  │                                                   │
│  │  - passageId ────┼──────────────────┐                                │
│  │  - prompt        │                  │                                │
│  │  - grammarData   │                  ▼                                │
│  │  - figure        │         ┌────────────────┐                        │
│  │  - tags[] ───────┼────┐    │ PASSAGES TABLE │                        │
│  │  - metadata ─────┼──┐ │    │                │                        │
│  └──────────────────┘  │ │    │  - content     │                        │
│                        │ │    │  - title       │                        │
│                        │ │    │  - author      │                        │
│                        │ │    └────────────────┘                        │
│                        │ │             ▲                                │
│                        │ │             │                                │
│    metadata contains:  │ └─────────────┤  tags contain:                 │
│    passage2Id ─────────┼───────────────┘  "passage2:{id}" ──────────────┘
│                        │                                                │
└────────────────────────┴────────────────────────────────────────────────┘


STORAGE PATTERN BY QUESTION TYPE:
=================================

1. READING QUESTIONS (central_ideas, inferences, command_of_evidence, etc.)
   ├── passageId → references passages table
   ├── prompt = question stem only
   └── Passage created separately, linked via foreign key

2. TRANSITIONS QUESTIONS
   ├── passageId → references passages table
   ├── prompt = "Which choice completes the text..."
   └── Passage content includes _____ blank marker

3. GRAMMAR QUESTIONS (boundaries, verb_agreement, etc.)
   ├── passageId = null (no separate passage)
   ├── grammarData.sentenceWithUnderline = "[underlined] portion"
   ├── grammarData.underlinedPortion = the tested text
   └── grammarData.grammarRule = rule being tested

4. CROSS-TEXT QUESTIONS
   ├── passageId → Text 1 (primary passage)
   ├── passage2 location (CHECK BOTH!):
   │   ├── metadata.promptParameters.passage2Id (string)
   │   └── tags array: "passage2:{passageId}"
   └── Both passages in passages table

5. READING DATA QUESTIONS (charts, graphs, tables)
   ├── passageId = null (no separate passage)
   ├── prompt = "{context passage}\n\n{question stem}"  ← EMBEDDED!
   ├── figure.imageId → references images table
   └── To extract passage: prompt.split("\n\n")[0]

6. MATH QUESTIONS
   ├── passageId = null (no passages)
   ├── prompt = problem text + question
   └── figure (optional) → references images table


FETCHING PASSAGES - CRITICAL PATTERN:
=====================================

// Standard passage fetch
if (question.passageId) {
  passage = await ctx.db.get(question.passageId);
}

// Cross-text passage2 - MUST CHECK BOTH LOCATIONS
let passage2Id = question.generationMetadata?.promptParameters?.passage2Id;
if (!passage2Id && question.tags) {
  const tag = question.tags.find(t => t.startsWith("passage2:"));
  if (tag) passage2Id = tag.replace("passage2:", "");
}
if (passage2Id) {
  passage2 = await ctx.db.get(passage2Id);
}

// Embedded passage (reading data questions)
if (!passage && question.figure && question.prompt.includes("\n\n")) {
  embeddedPassage = question.prompt.split("\n\n")[0];
}
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `questions` | Main question storage, references passages via `passageId` |
| `passages` | Separate passage content storage |
| `images` | Figure/chart storage for data questions |
| `answerOptions` | Answer choices linked to questions |
| `explanations` | Detailed explanations linked to questions |

### Common Pitfalls

1. **passage2 inconsistency**: Some questions store passage2 in metadata, others in tags. Always check both.
2. **Embedded passages**: Reading data questions have no passageId - passage is in the prompt field.
3. **Grammar questions**: Use grammarData field, not passages table.

## Question Generation Files

| File | Question Type | Passage Storage |
|------|---------------|-----------------|
| `readingQuestionGeneration.ts` | Reading (central_ideas, inferences, etc.) | Separate passage record |
| `transitionsQuestionGeneration.ts` | Transitions | Separate passage record |
| `grammarQuestionGeneration.ts` | Grammar (boundaries, verb, etc.) | grammarData field |
| `crossTextQuestionGeneration.ts` | Cross-text connections | Two separate passages |
| `readingDataGeneration.ts` | Data interpretation (charts) | Embedded in prompt |
| `mathQuestionGeneration.ts` | Math | No passage |

## Admin vs Practice/Endless Queries

All pages now use consistent passage fetching that checks both metadata and tags for passage2.

- `convex/admin.ts` - Admin question browser
- `convex/questions.ts` - Practice mode queries
- `convex/endless.ts` - Endless mode queries

## Question Import Pipeline

Questions generated by the SAT Question Generator must be transformed and validated before import.

### Import Workflow

```
IMPORT PIPELINE:
================

[SAT Generator Output]     [Transform Script]        [Validation]           [Import]
        │                         │                       │                    │
   generated/*.json  ──►  transform-generator  ──►  validate-import  ──►  import-questions
                          -questions.mjs            -data.mjs              .mjs
                                │                       │                    │
                                ▼                       ▼                    ▼
                         generator-import.json    Checks all data      Creates records
                         (transformed format)     integrity rules      in Convex DB
```

### Commands

```bash
# 1. Transform questions from generator format to Big App format
node scripts/transform-generator-questions.mjs --passing-only

# 2. Validate BEFORE importing (catches data integrity issues)
npm run validate:import generator-import.json

# 3. Clear existing questions (if re-importing)
npx convex run seed:clearAllQuestions '{}'

# 4. Import questions
npm run import:questions generator-import.json
```

### Validation Script (`scripts/validate-import-data.mjs`)

**ALWAYS run validation before importing.** This catches issues that would cause silent failures:

```bash
npm run validate:import generator-import.json
```

**What it checks:**
- All passages have valid `passageType` values
- All reading/writing questions have `passageId` set
- All `passageId` references exist in the passages object
- Required fields (prompt, correctAnswer, options) are present

**Valid passageType values** (Convex schema):
- `literary_narrative`
- `social_science`
- `natural_science`
- `humanities`

**INVALID values that will cause import failures:**
- `informational` (use `social_science` instead)
- `argumentative` (use `social_science` instead)
- `expository` (use `natural_science` instead)

### Transform Utilities (`scripts/transform-utils.mjs`)

Core transformation functions extracted for testing:

| Function | Purpose |
|----------|---------|
| `mapPassageType(genre)` | Maps generator genre → valid Convex passageType |
| `mapCategory(section)` | Maps READING/MATH → reading_writing/math |
| `mapDomain(domain)` | Converts PascalCase → snake_case |
| `transformQuestion(genQuestion)` | Full question transformation |

### Testing

```bash
# Run transform utility tests
node scripts/__tests__/run-tests.mjs

# Run with Vitest (if rollup dependency resolves)
npm run test:run
```

**Test file:** `scripts/__tests__/transform-utils.test.mjs`

Tests verify:
- `mapPassageType` returns only valid schema values
- All genre mappings produce valid passageTypes
- Reading/writing questions with passages get `passageId` and `passageData`
- Invalid values like `"informational"` are never returned

### Common Import Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Passages not showing in admin | Invalid `passageType` caused silent import failure | Run validation, fix mappings, re-import |
| Questions missing passageId | Passage import failed, question imported without link | Check validation errors, ensure passages import first |
| "Invalid passageType" error | Generator genre not mapped to valid schema value | Update `mapPassageType` in transform-utils.mjs |

### Key Files

| File | Purpose |
|------|---------|
| `scripts/transform-generator-questions.mjs` | Main transform script |
| `scripts/transform-utils.mjs` | Exported utility functions (testable) |
| `scripts/validate-import-data.mjs` | Pre-import validation |
| `scripts/import-questions.mjs` | Imports to Convex database |
| `convex/questionImport.ts` | Convex mutations for import |
