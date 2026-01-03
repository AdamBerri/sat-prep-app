"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

// ─────────────────────────────────────────────────────────
// CLAUDE IMAGE PROMPT GENERATOR
// ─────────────────────────────────────────────────────────
// Stage 1 of the two-stage pipeline:
// Claude analyzes the question and generates an accurate
// image description for Nano Banana Pro to render.

/**
 * Initialize the Anthropic client with API key from environment.
 */
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required. " +
        "Add it to your Convex dashboard environment variables."
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * System prompt for Claude to generate image descriptions.
 * Focuses on accuracy and providing exact mathematical details.
 */
const SYSTEM_PROMPT = `You are an expert at creating image descriptions for SAT math questions. Your job is to analyze a math question and generate a precise, accurate description that an AI image generator can use to create the figure.

IMPORTANT GUIDELINES:
1. ACCURACY FIRST: Include exact coordinates, values, measurements, and labels. The image must match the math in the question.
2. NARRATIVE STYLE: Write in flowing sentences, not bullet points. Describe the scene naturally.
3. CONCISE: Keep descriptions to 2-4 sentences. Don't over-specify styling - just describe what to draw.
4. RENDER AS DIGITAL ILLUSTRATION: Always specify "as a flat digital vector illustration". The output should be a clean, print-ready graphic - NOT a photograph of a test paper. Emphasize: crisp black lines, pure white background, no paper texture, no shadows, no photorealistic effects.
5. FIGURE TYPES:
   - "graph": Coordinate plane with functions, points, or lines
   - "data_display": Bar charts, histograms, scatter plots, pie charts
   - "geometric": Triangles, circles, angles, parallel lines, 3D shapes

EXAMPLES:

Question: "The graph shows a line passing through (0, 2) and (4, 6). What is the slope?"
Good prompt: "Create an SAT-style coordinate plane graph as a flat digital vector illustration. Draw a straight line passing through the points (0, 2) and (4, 6) with small dots marking these two points. Show x and y axes from -2 to 8 with labeled integer tick marks. Render with crisp black lines on pure white background - no paper texture or photorealistic effects."

Question: "A triangle has angles of 45°, 60°, and x°. Find x."
Good prompt: "Create an SAT-style triangle diagram as a flat digital vector illustration. Draw a triangle with vertices labeled A, B, and C. Mark angle A as 45° and angle B as 60° with small arcs and labels. Mark angle C with just an arc (no label - that's what students solve for). Crisp black lines on pure white background, print-ready graphic style."

Question: "The bar graph shows monthly sales. March had 150 units and April had 200 units."
Good prompt: "Create an SAT-style vertical bar chart as a flat digital vector illustration. Include bars for March (height 150) and April (height 200), with a y-axis labeled 'Units Sold' from 0 to 250. The bars should be solid gray with exact heights readable from the gridlines. Clean print-ready graphic, not a photograph."

Now generate an image prompt for the given question. Output ONLY the prompt text, nothing else.`;

/**
 * Generate an image prompt for a question using Claude.
 * Takes the question data and returns a narrative description
 * optimized for Nano Banana Pro.
 */
export const generateImagePrompt = internalAction({
  args: {
    questionPrompt: v.string(),
    options: v.array(
      v.object({
        key: v.string(),
        content: v.string(),
      })
    ),
    correctAnswer: v.string(),
    figureType: v.union(
      v.literal("graph"),
      v.literal("geometric"),
      v.literal("data_display")
    ),
    domain: v.optional(v.string()),
    skill: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const anthropic = getAnthropicClient();

    // Format the question for Claude
    const optionsText = args.options
      .map((opt) => `${opt.key}. ${opt.content}`)
      .join("\n");

    const userPrompt = `Question: ${args.questionPrompt}

Options:
${optionsText}

Correct Answer: ${args.correctAnswer}
Figure Type: ${args.figureType}
${args.domain ? `Domain: ${args.domain}` : ""}
${args.skill ? `Skill: ${args.skill}` : ""}

Generate the image prompt:`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract the text response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return textBlock.text.trim();
  },
});

/**
 * Batch generate image prompts for multiple questions.
 * Returns an array of prompts in the same order as input.
 */
export const batchGenerateImagePrompts = internalAction({
  args: {
    questions: v.array(
      v.object({
        questionPrompt: v.string(),
        options: v.array(
          v.object({
            key: v.string(),
            content: v.string(),
          })
        ),
        correctAnswer: v.string(),
        figureType: v.union(
          v.literal("graph"),
          v.literal("geometric"),
          v.literal("data_display")
        ),
        domain: v.optional(v.string()),
        skill: v.optional(v.string()),
      })
    ),
  },
  handler: async (_ctx, args) => {
    const anthropic = getAnthropicClient();
    const results: Array<{ prompt: string } | { error: string }> = [];

    console.log(
      `Generating ${args.questions.length} image prompts with Claude...`
    );

    for (let i = 0; i < args.questions.length; i++) {
      const q = args.questions[i];
      console.log(`Generating prompt ${i + 1}/${args.questions.length}...`);

      try {
        const optionsText = q.options
          .map((opt) => `${opt.key}. ${opt.content}`)
          .join("\n");

        const userPrompt = `Question: ${q.questionPrompt}

Options:
${optionsText}

Correct Answer: ${q.correctAnswer}
Figure Type: ${q.figureType}
${q.domain ? `Domain: ${q.domain}` : ""}
${q.skill ? `Skill: ${q.skill}` : ""}

Generate the image prompt:`;

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
          system: SYSTEM_PROMPT,
        });

        const textBlock = response.content.find(
          (block) => block.type === "text"
        );
        if (!textBlock || textBlock.type !== "text") {
          results.push({ error: "No text response from Claude" });
        } else {
          results.push({ prompt: textBlock.text.trim() });
        }
      } catch (error) {
        console.error(`Error generating prompt ${i}:`, error);
        results.push({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(
      `Generated ${results.filter((r) => "prompt" in r).length}/${args.questions.length} prompts successfully`
    );

    return results;
  },
});
