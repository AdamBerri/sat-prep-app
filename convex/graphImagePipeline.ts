"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { ALL_GRAPH_QUESTION_TEMPLATES } from "./graphQuestionTemplates";

// ─────────────────────────────────────────────────────────
// TWO-STAGE GRAPH IMAGE PIPELINE
// ─────────────────────────────────────────────────────────
// Stage 1: Claude analyzes the question and generates an image prompt
// Stage 2: Nano Banana Pro renders the image
// This pipeline is designed to scale to thousands of questions.

/**
 * System prompt for Claude to generate image descriptions.
 */
const CLAUDE_SYSTEM_PROMPT = `You are an expert at creating image descriptions for SAT math questions. Your job is to analyze a math question and generate a precise, accurate description that an AI image generator can use to create the figure.

CRITICAL GUIDELINES:
1. ACCURACY FIRST: Include exact coordinates, values, measurements, and labels. The image must match the math in the question.
2. NARRATIVE STYLE: Write in flowing sentences, not bullet points. Describe the scene naturally.
3. CONCISE: Keep descriptions to 2-4 sentences. Don't over-specify styling.
4. SAT STYLE: Mention "SAT-style" once. The renderer handles clean, professional look.
5. FIGURE TYPES:
   - "graph": Coordinate plane with functions, points, or lines
   - "data_display": Bar charts, histograms, scatter plots
   - "geometric": Triangles, circles, angles, parallel lines

EXAMPLES:

Question: "The graph shows a line passing through (0, 2) and (4, 6). What is the slope?"
Prompt: "Create an SAT-style coordinate plane graph. Draw a straight line passing through the points (0, 2) and (4, 6) with small dots marking these two points. Show x and y axes from -2 to 8 with labeled integer tick marks and a light grid background."

Question: "A triangle has angles of 45°, 60°, and x°. Find x."
Prompt: "Create an SAT-style triangle diagram. Draw a triangle with vertices labeled A, B, and C. Mark angle A as 45° and angle B as 60° with small arcs and labels. Mark angle C with just an arc (no label - that's what students solve for). Clean black lines on white background."

Output ONLY the prompt text, nothing else.`;

/**
 * Main pipeline action: processes questions through both stages.
 */
export const generateGraphImages = internalAction({
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
  handler: async (ctx, args) => {
    console.log(`Starting two-stage pipeline for ${args.questions.length} questions...`);

    // Initialize clients
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const geminiApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    if (!geminiApiKey) {
      throw new Error("GOOGLE_AI_STUDIO_API_KEY environment variable is required");
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const gemini = new GoogleGenAI({ apiKey: geminiApiKey });

    const results: Array<{
      questionIndex: number;
      imageId?: string;
      error?: string;
      claudePrompt?: string;
    }> = [];

    // Process each question through both stages
    for (let i = 0; i < args.questions.length; i++) {
      const question = args.questions[i];
      console.log(`\n[${i + 1}/${args.questions.length}] Processing: ${question.figureType}`);

      try {
        // ─────────────────────────────────────────────────────
        // STAGE 1: Claude generates the image prompt
        // ─────────────────────────────────────────────────────
        console.log("  Stage 1: Claude analyzing question...");

        const optionsText = question.options
          .map((opt) => `${opt.key}. ${opt.content}`)
          .join("\n");

        const claudeInput = `Question: ${question.questionPrompt}

Options:
${optionsText}

Correct Answer: ${question.correctAnswer}
Figure Type: ${question.figureType}
${question.domain ? `Domain: ${question.domain}` : ""}
${question.skill ? `Skill: ${question.skill}` : ""}

Generate the image prompt:`;

        const claudeResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: claudeInput }],
          system: CLAUDE_SYSTEM_PROMPT,
        });

        const textBlock = claudeResponse.content.find((b) => b.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          throw new Error("Claude returned no text response");
        }

        const imagePrompt = textBlock.text.trim();
        console.log(`  Claude prompt: "${imagePrompt.slice(0, 80)}..."`);

        // ─────────────────────────────────────────────────────
        // STAGE 2: Nano Banana Pro renders the image
        // ─────────────────────────────────────────────────────
        console.log("  Stage 2: Nano Banana Pro rendering...");

        const geminiResponse = await gemini.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: imagePrompt,
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: "4:3",
              imageSize: "2K",
            },
          },
        });

        // Extract image from response
        const imagePart = geminiResponse.candidates?.[0]?.content?.parts?.find(
          (part: { inlineData?: { mimeType?: string; data?: string } }) =>
            part.inlineData?.mimeType?.startsWith("image/")
        );

        if (!imagePart?.inlineData?.data) {
          throw new Error("Nano Banana Pro returned no image");
        }

        // Upload to Convex storage
        const imageData = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType || "image/png";

        const binaryString = atob(imageData);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        const blob = new Blob([bytes], { type: mimeType });

        const uploadUrl = (await ctx.runMutation(
          internal.images.generateUploadUrlInternal
        )) as string;

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const { storageId } = await uploadResponse.json();

        // Store image metadata
        const template = ALL_GRAPH_QUESTION_TEMPLATES[i];
        const imageId = (await ctx.runMutation(internal.images.storeImageInternal, {
          storageId,
          width: 1600,
          height: 1200,
          altText: template?.imageAltText || "SAT graph figure",
          aspectRatio: 4 / 3,
        })) as string;

        console.log(`  ✓ Success: ${imageId}`);
        results.push({
          questionIndex: i,
          imageId: imageId.toString(),
          claudePrompt: imagePrompt,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`  ✗ Error: ${errorMsg}`);

        // Determine which stage failed
        let errorStage: "claude" | "gemini" | "upload" = "claude";
        if (errorMsg.includes("Nano Banana") || errorMsg.includes("gemini")) {
          errorStage = "gemini";
        } else if (errorMsg.includes("Upload") || errorMsg.includes("upload")) {
          errorStage = "upload";
        }

        // Add to DLQ for retry
        const template = ALL_GRAPH_QUESTION_TEMPLATES[i];
        await ctx.runMutation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (internal as any).imageGenerationDLQ.addToDLQ,
          {
            questionPrompt: question.questionPrompt,
            options: question.options,
            correctAnswer: question.correctAnswer,
            figureType: question.figureType,
            domain: question.domain,
            skill: question.skill,
            imageAltText: template?.imageAltText,
            error: errorMsg,
            errorStage,
          }
        );
        console.log(`  Added to DLQ for retry`);

        results.push({
          questionIndex: i,
          error: errorMsg,
        });
      }

      // Rate limiting between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Summary
    const successful = results.filter((r) => r.imageId).length;
    const failed = results.filter((r) => r.error).length;
    console.log(`\nPipeline complete: ${successful}/${args.questions.length} successful, ${failed} added to DLQ`);

    // Create questions for successful images
    if (successful > 0) {
      console.log("Creating questions in database...");
      const createResult = await ctx.runMutation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).seed.createGraphQuestionsWithImages,
        { imageResults: results }
      );
      console.log(`Created ${createResult.created} questions, ${createResult.errors} errors`);
    }

    return results;
  },
});

/**
 * Retry DLQ items.
 */
export const retryDLQItems = internalAction({
  args: {
    dlqIds: v.array(v.id("imageGenerationDLQ")),
  },
  handler: async (ctx, args) => {
    console.log(`Retrying ${args.dlqIds.length} DLQ items...`);

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const geminiApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

    if (!anthropicApiKey || !geminiApiKey) {
      throw new Error("API keys not configured");
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const gemini = new GoogleGenAI({ apiKey: geminiApiKey });

    let succeeded = 0;
    let failed = 0;

    for (const dlqId of args.dlqIds) {
      // Get the DLQ item
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = await (ctx as any).runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).imageGenerationDLQ.getItemById,
        { dlqId }
      );

      if (!item) {
        console.log(`DLQ item ${dlqId} not found, skipping`);
        continue;
      }

      // Mark as retrying
      await ctx.runMutation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).imageGenerationDLQ.markRetrying,
        { dlqId }
      );

      console.log(`\nRetrying: ${item.figureType} (attempt ${item.retryCount + 1}/${item.maxRetries})`);

      try {
        let imagePrompt = item.claudePrompt;

        // Stage 1: Generate prompt if we don't have one
        if (!imagePrompt) {
          console.log("  Stage 1: Claude analyzing question...");

          const optionsText = item.options
            .map((opt: { key: string; content: string }) => `${opt.key}. ${opt.content}`)
            .join("\n");

          const claudeInput = `Question: ${item.questionPrompt}

Options:
${optionsText}

Correct Answer: ${item.correctAnswer}
Figure Type: ${item.figureType}
${item.domain ? `Domain: ${item.domain}` : ""}
${item.skill ? `Skill: ${item.skill}` : ""}

Generate the image prompt:`;

          const claudeResponse = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            messages: [{ role: "user", content: claudeInput }],
            system: CLAUDE_SYSTEM_PROMPT,
          });

          const textBlock = claudeResponse.content.find((b) => b.type === "text");
          if (!textBlock || textBlock.type !== "text") {
            throw new Error("Claude returned no text response");
          }

          imagePrompt = textBlock.text.trim();
        }

        // Stage 2: Render image
        console.log("  Stage 2: Nano Banana Pro rendering...");

        const geminiResponse = await gemini.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: imagePrompt,
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: "4:3",
              imageSize: "2K",
            },
          },
        });

        const imagePart = geminiResponse.candidates?.[0]?.content?.parts?.find(
          (part: { inlineData?: { mimeType?: string; data?: string } }) =>
            part.inlineData?.mimeType?.startsWith("image/")
        );

        if (!imagePart?.inlineData?.data) {
          throw new Error("Nano Banana Pro returned no image");
        }

        // Upload to Convex storage
        const imageData = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType || "image/png";

        const binaryString = atob(imageData);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        const blob = new Blob([bytes], { type: mimeType });

        const uploadUrl = (await ctx.runMutation(
          internal.images.generateUploadUrlInternal
        )) as string;

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const { storageId } = await uploadResponse.json();

        // Store image metadata
        const imageId = (await ctx.runMutation(internal.images.storeImageInternal, {
          storageId,
          width: 1600,
          height: 1200,
          altText: item.imageAltText || "SAT graph figure",
          aspectRatio: 4 / 3,
        })) as string;

        // Mark as succeeded
        await ctx.runMutation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (internal as any).imageGenerationDLQ.markSucceeded,
          { dlqId, imageId }
        );

        console.log(`  ✓ Success: ${imageId}`);
        succeeded++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`  ✗ Error: ${errorMsg}`);

        let errorStage: "claude" | "gemini" | "upload" = "claude";
        if (errorMsg.includes("Nano Banana") || errorMsg.includes("gemini")) {
          errorStage = "gemini";
        } else if (errorMsg.includes("Upload") || errorMsg.includes("upload")) {
          errorStage = "upload";
        }

        const result = await ctx.runMutation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (internal as any).imageGenerationDLQ.markFailed,
          { dlqId, error: errorMsg, errorStage }
        );

        if (result.isPermanentFailure) {
          console.log(`  Marked as permanently failed after ${item.maxRetries} attempts`);
        }

        failed++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`\nRetry complete: ${succeeded} succeeded, ${failed} failed`);
    return { succeeded, failed };
  },
});
