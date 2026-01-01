# Graph Image Generation System

## Overview

This system generates SAT-style graph and figure images for math questions using a two-stage AI pipeline. It's designed to scale to thousands of questions without hardcoding image prompts.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Question Data  │────▶│  Claude Sonnet   │────▶│ Nano Banana Pro │
│  (prompt, opts) │     │  (Stage 1)       │     │  (Stage 2)      │
└─────────────────┘     │  Generates image │     │  Renders image  │
                        │  description     │     │                 │
                        └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              │
                        │  Convex Storage  │◀─────────────┘
                        │  (stores image)  │
                        └──────────────────┘
```

### Stage 1: Claude (Anthropic API)
- **Model**: `claude-sonnet-4-20250514`
- **Purpose**: Analyzes the math question and generates a precise, accurate image description
- **Why Claude**: Excellent at understanding mathematical concepts and writing precise descriptions

### Stage 2: Nano Banana Pro (Google Gemini)
- **Model**: `gemini-3-pro-image-preview`
- **Purpose**: Renders the SAT-style image from Claude's description
- **Why Nano Banana Pro**: Has built-in "Thinking" for complex instructions, excellent text rendering

## Key Learnings

### 1. Model Selection Matters

We initially used `gemini-2.0-flash-exp` which produced poor results (only 1/9 images succeeded). Switching to `gemini-3-pro-image-preview` (Nano Banana Pro) dramatically improved quality.

**Wrong model:**
```typescript
// OLD - Poor results
model: "gemini-2.0-flash-exp"
```

**Correct model:**
```typescript
// NEW - Much better results
model: "gemini-3-pro-image-preview"
```

### 2. SDK Matters Too

Google has two SDKs:
- `@google/generative-ai` - **Legacy**, being phased out
- `@google/genai` - **New**, recommended for all Gemini models

```bash
npm uninstall @google/generative-ai
npm install @google/genai
```

### 3. Don't Over-Prompt

Nano Banana Pro has built-in "Thinking" that handles styling automatically. Over-specifying with bullet points actually hurts quality.

**Bad prompt (over-specified):**
```
A coordinate plane showing a linear function.
- X-axis from -5 to 5 with tick marks at each integer, labeled "x"
- Y-axis from -5 to 5 with tick marks at each integer, labeled "y"
- Light gray grid lines
- A straight line passing through points (-2, -1) and (2, 1)
- The line should be drawn in solid black, medium thickness
- Small dots at the two key points (-2, -1) and (2, 1)
- Arrows at both ends of the line
```

**Good prompt (narrative):**
```
Create an SAT-style coordinate plane graph. Draw a straight line passing
through the points (-2, -1) and (2, 1) with small dots marking these points.
Show x and y axes from -5 to 5 with integer tick marks. Include a light
grid background.
```

### 4. Let Claude Generate the Prompts

Instead of hardcoding image prompts for each question, let Claude analyze the math question and generate an appropriate prompt. This scales to thousands of questions.

**Claude's system prompt focuses on:**
1. ACCURACY FIRST - exact coordinates, values, labels
2. NARRATIVE STYLE - flowing sentences, not bullets
3. CONCISE - 2-4 sentences max
4. SAT STYLE - mention once, let renderer handle it

### 5. Image Configuration

```typescript
config: {
  responseModalities: ["TEXT", "IMAGE"],
  imageConfig: {
    aspectRatio: "4:3",  // Good for graphs/charts
    imageSize: "2K"      // High quality
  }
}
```

## Files

| File | Purpose |
|------|---------|
| `convex/graphImagePipeline.ts` | Main two-stage pipeline orchestrator |
| `convex/claudeImagePrompts.ts` | Claude prompt generation (standalone) |
| `convex/geminiImages.ts` | Nano Banana Pro image rendering |
| `convex/imageGenerationDLQ.ts` | Dead Letter Queue for retries |
| `convex/graphQuestionTemplates.ts` | Question templates (prompts optional) |
| `convex/images.ts` | Convex file storage functions |
| `src/components/QuestionFigure.tsx` | React component to display figures |

## Environment Variables

Add these to Convex dashboard (Settings → Environment Variables):

```
GOOGLE_AI_STUDIO_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Usage

### Seed Graph Questions
```bash
# Clear existing graph questions first
npx convex run seed:clearGraphQuestions

# Generate new graph questions with images
npx convex run seed:seedGraphQuestions
```

### Monitor Progress
Watch the Convex logs in the terminal running `npx convex dev`.

### DLQ (Dead Letter Queue)

Failed image generations are automatically added to the DLQ for retry.

```bash
# Check DLQ stats
npx convex run imageGenerationDLQ:getStats

# View pending failures
npx convex run imageGenerationDLQ:getPendingItems

# Retry failed items
npx convex run imageGenerationDLQ:retryPendingItems

# Clear succeeded items
npx convex run imageGenerationDLQ:clearSucceeded
```

## Question Schema

Questions with figures have this structure:

```typescript
{
  type: "multiple_choice",
  category: "math",
  prompt: "The graph shows...",
  figure: {
    imageId: Id<"images">,    // Reference to stored image
    figureType: "graph" | "geometric" | "data_display",
    caption: "Description for accessibility"
  },
  options: [...],
  correctAnswer: "B",
  // ... other fields
}
```

## Figure Types

1. **graph** - Coordinate plane with functions, points, lines
   - Linear functions
   - Quadratic functions (parabolas)
   - Exponential functions

2. **data_display** - Statistical visualizations
   - Bar charts
   - Scatter plots with line of best fit
   - Histograms

3. **geometric** - Geometric figures
   - Triangles with labeled angles
   - Circles with sectors
   - Parallel lines with transversals

## Performance

- Each image takes ~30-60 seconds:
  - Claude analysis: 5-15 seconds
  - Nano Banana Pro rendering: 20-45 seconds
  - Rate limiting delay: 2 seconds

- For 9 questions: ~8-10 minutes total
- Expect ~90% success rate (some timeouts normal)

## Troubleshooting

### "Request timed out"
Normal for complex images. The item is added to DLQ and can be retried.

### "No image generated in response"
Nano Banana Pro couldn't render the image. Usually a prompt issue. Check the Claude-generated prompt in the DLQ.

### "ANTHROPIC_API_KEY not found"
```bash
npx convex env set ANTHROPIC_API_KEY "sk-ant-..."
```

### "GOOGLE_AI_STUDIO_API_KEY not found"
```bash
npx convex env set GOOGLE_AI_STUDIO_API_KEY "AI..."
```

## Future Improvements

1. **Parallel processing** - Process multiple images concurrently (respecting rate limits)
2. **Caching Claude prompts** - Store successful prompts for similar question types
3. **Quality scoring** - Automatically evaluate generated images
4. **Fallback to SVG** - For simple graphs, generate SVG programmatically as fallback

## References

- [Nano Banana Pro docs](https://ai.google.dev/gemini-api/docs/nanobanana)
- [Gemini Image Generation guide](https://ai.google.dev/gemini-api/docs/image-generation)
- [@google/genai npm package](https://www.npmjs.com/package/@google/genai)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/messages_post)
