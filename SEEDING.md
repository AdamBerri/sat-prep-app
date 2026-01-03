# Question Generation Guide

Generate SAT practice questions using AI pipelines.

## Prerequisites

1. **Convex dev server running:**
   ```bash
   npx convex dev
   ```

2. **API keys set** in Convex Dashboard > Settings > Environment Variables:
   - `ANTHROPIC_API_KEY` - For Claude (passage + question generation)
   - `GOOGLE_AI_STUDIO_API_KEY` - For Gemini (image generation)

## Quick Start

```bash
# Generate 100 reading questions (passage-based)
npm run generate:reading 100

# Generate 50 data questions (charts/graphs/tables)
npm run generate:reading-data 50

# Generate math questions (from templates)
npm run generate:math
```

## Reading Questions (Passage-Based)

SAT-style reading comprehension with AI-generated passages.

```bash
# Generate 100 random reading questions
npm run generate:reading 100

# Generate 50 questions of specific types
npm run generate:reading 50 central_ideas,inferences
```

### Question Types

| Type | Description |
|------|-------------|
| `central_ideas` | Main point/purpose of passage |
| `inferences` | What can be inferred from text |
| `vocabulary_in_context` | Word meaning in context |
| `text_structure` | Paragraph/section function |
| `command_of_evidence` | Which quote supports claim |
| `rhetorical_synthesis` | Complete with evidence |

### Passage Types

Passages are automatically generated in these categories:
- `literary_narrative` - Fiction, memoir
- `social_science` - Psychology, sociology
- `natural_science` - Biology, chemistry, physics
- `humanities` - History, philosophy, art

## Reading Data Questions (Charts/Graphs/Tables)

SAT-style data interpretation with AI-generated visualizations.

```bash
# Generate 100 random data questions
npm run generate:reading-data 100

# Generate 50 questions with specific chart types
npm run generate:reading-data 50 bar_chart,line_graph
```

### Data Types

| Type | Description |
|------|-------------|
| `bar_chart` | Vertical/horizontal bar charts |
| `line_graph` | Time series and trend data |
| `data_table` | Tabular data with rows/columns |

## Math Questions

Math questions with coordinate planes, geometric figures, and data displays.

```bash
# Generate all math questions from templates
npm run generate:math
```

Uses the two-stage pipeline:
1. Claude generates precise image prompts
2. Gemini renders the figures

## Viewing Generated Questions

While `npx convex dev` is running:

**Dashboard:** http://127.0.0.1:6790

Or via CLI:
```bash
npx convex data questions --limit 10
npx convex data passages --limit 5
npx convex data answerOptions --limit 20
```

## Failed Generation Recovery (DLQ)

Failed generations are saved to a Dead Letter Queue for retry.

### Reading Questions DLQ
```bash
npm run dlq:reading:stats            # View statistics
npm run dlq:reading:pending          # List pending items
npm run dlq:reading:recent           # Recent failures
npm run dlq:reading:retry            # Retry all pending
npm run dlq:reading:clear-succeeded  # Clean up succeeded
```

### Data Questions DLQ
```bash
npm run dlq:data:stats               # View statistics
npm run dlq:data:pending             # List pending items
npm run dlq:data:recent              # Recent failures
npm run dlq:data:retry               # Retry all pending
npm run dlq:data:clear-succeeded     # Clean up succeeded
```

## Clearing Questions

```bash
# Clear ALL questions (use with caution!)
npm run generate:clear

# Clear only math/graph questions
npm run generate:graph:clear
```

## Generating at Scale

For large batches, add delays to avoid rate limits:

```bash
# Generate 1000 reading questions (10 batches of 100)
for i in {1..10}; do
  npm run generate:reading 100
  sleep 60
done

# Generate 500 data questions (5 batches of 100)
for i in {1..5}; do
  npm run generate:reading-data 100
  sleep 60
done
```

## Cost Estimates

| Service | Per Question | 100 Questions | 1000 Questions |
|---------|--------------|---------------|----------------|
| Claude (passage + question) | ~$0.03 | ~$3 | ~$30 |
| Gemini (images for data) | ~$0.01 | ~$1 | ~$10 |
| **Total (reading)** | ~$0.03 | ~$3 | ~$30 |
| **Total (data)** | ~$0.04 | ~$4 | ~$40 |

## Architecture

```
scripts/
├── generate-reading.mjs       # CLI wrapper for reading questions
├── generate-reading-data.mjs  # CLI wrapper for data questions
└── generate-math.mjs          # CLI wrapper for math questions

convex/
├── readingQuestionGeneration.ts   # Reading pipeline
├── readingQuestionTemplates.ts    # Sampling parameters
├── readingQuestionPrompts.ts      # Claude prompts
├── readingQuestionDLQ.ts          # Failed retry queue
├── readingDataGeneration.ts       # Data question pipeline
├── readingDataTemplates.ts        # Data sampling params
├── readingDataImagePrompts.ts     # Chart rendering
├── readingDataDLQ.ts              # Failed retry queue
├── graphQuestionTemplates.ts      # Math graph templates
├── graphImagePipeline.ts          # Math image pipeline
└── seed.ts                        # Entry points & utilities
```

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable is required"
Set your API key in Convex Dashboard > Settings > Environment Variables.

### "Gemini returned no image"
Check your `GOOGLE_AI_STUDIO_API_KEY` and ensure you have access to image generation.

### Questions not appearing
1. Check Convex logs in terminal running `npx convex dev`
2. Check DLQ for failed items: `npm run dlq:reading:stats`
3. View dashboard: http://127.0.0.1:6790

### Rate limiting
Add delays between batches. The generation scripts handle internal rate limiting, but running multiple batches back-to-back can hit API limits.
