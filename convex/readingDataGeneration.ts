"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { Id } from "./_generated/dataModel";

import {
  sampleQuestionParams,
  buildDataGenerationPrompt,
  buildQuestionGenerationPrompt,
  type SampledQuestionParams,
  type DataDomain,
} from "./readingDataTemplates";

import {
  buildChartPrompt,
  validateChartData,
  type DataType,
  type ChartData,
} from "./readingDataImagePrompts";

// Error stage types for DLQ
type ErrorStage = "data_generation" | "image_generation" | "question_generation" | "storage";

// ─────────────────────────────────────────────────────────
// READING DATA QUESTION GENERATION PIPELINE
// ─────────────────────────────────────────────────────────
// Pipeline: Sample params → Generate data → Render chart → Generate question
// Uses verbalized sampling for maximum question uniqueness.

/**
 * Get Anthropic client from environment.
 */
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey });
}

/**
 * Get Gemini client from environment.
 */
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_STUDIO_API_KEY environment variable is required");
  }
  return new GoogleGenAI({ apiKey });
}

// ─────────────────────────────────────────────────────────
// STAGE 1: DATA GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate realistic dataset using Claude based on sampled parameters.
 */
async function generateDataWithClaude(
  anthropic: Anthropic,
  params: SampledQuestionParams,
  dataType: DataType
): Promise<ChartData> {
  const prompt = buildDataGenerationPrompt(params, dataType);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for data generation");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const data = JSON.parse(jsonMatch[0]);

  // Validate the data structure
  if (!validateChartData(dataType, data)) {
    console.error(`Invalid data structure for ${dataType}. Received:`, JSON.stringify(data, null, 2));
    throw new Error(`Invalid data structure for ${dataType}. Keys: ${Object.keys(data).join(", ")}`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────
// STAGE 2: IMAGE GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate chart image using Gemini (Nano Banana Pro) and store it.
 */
async function generateChartImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  gemini: GoogleGenAI,
  dataType: DataType,
  chartData: ChartData
): Promise<Id<"images">> {
  const { prompt, altText } = buildChartPrompt(dataType, chartData);

  console.log(`  Rendering ${dataType} with Gemini...`);

  const response = await gemini.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "4:3",
        imageSize: "2K",
      },
    },
  });

  // Extract image from response
  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { mimeType?: string; data?: string } }) =>
      part.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini returned no image");
  }

  // Upload to Convex storage
  const imageData = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType || "image/png";

  const binaryString = atob(imageData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
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
    altText,
    aspectRatio: 4 / 3,
  })) as Id<"images">;

  return imageId;
}

// ─────────────────────────────────────────────────────────
// STAGE 3: QUESTION GENERATION
// ─────────────────────────────────────────────────────────

interface GeneratedQuestion {
  passage: string;
  questionStem: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  explanation: string;
  distractorExplanations?: {
    B?: string;
    C?: string;
    D?: string;
  };
}

/**
 * Generate question, passage, and answer choices using Claude.
 */
async function generateQuestionWithClaude(
  anthropic: Anthropic,
  params: SampledQuestionParams,
  chartData: ChartData
): Promise<GeneratedQuestion> {
  const dataJson = JSON.stringify(chartData, null, 2);
  const prompt = buildQuestionGenerationPrompt(params, dataJson);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for question generation");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const question = JSON.parse(jsonMatch[0]) as GeneratedQuestion;

  // Validate required fields
  if (
    !question.passage ||
    !question.questionStem ||
    !question.choices ||
    !question.explanation
  ) {
    throw new Error("Generated question missing required fields");
  }

  return question;
}

// ─────────────────────────────────────────────────────────
// CORE GENERATION LOGIC
// ─────────────────────────────────────────────────────────

interface GenerationResult {
  success: boolean;
  questionId?: Id<"questions">;
  imageId?: Id<"images">;
  error?: string;
  errorStage?: ErrorStage;
  sampledParams: SampledQuestionParams;
  chartData?: ChartData;
  chartTitle?: string;
}

/**
 * Core logic for generating a single reading data question.
 * Used by both single and batch generation.
 * Returns detailed error info for DLQ.
 */
async function generateSingleQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  anthropic: Anthropic,
  gemini: GoogleGenAI,
  dataType: DataType,
  params: SampledQuestionParams,
  batchId?: string,
  existingChartData?: ChartData // For retries where data was already generated
): Promise<GenerationResult> {
  let chartData: ChartData | undefined = existingChartData;
  let imageId: Id<"images"> | undefined;

  try {
    // 1. GENERATE data with Claude (skip if we already have it)
    if (!chartData) {
      console.log("  Stage 1: Generating data with Claude...");
      try {
        chartData = await generateDataWithClaude(anthropic, params, dataType);
        console.log(`    Generated: "${chartData.title}"`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: errorMsg,
          errorStage: "data_generation",
          sampledParams: params,
        };
      }
    } else {
      console.log("  Stage 1: Using existing chart data...");
    }

    // 2. GENERATE chart image with Gemini
    console.log("  Stage 2: Rendering chart with Gemini...");
    try {
      imageId = await generateChartImage(ctx, gemini, dataType, chartData);
      console.log(`    Image ID: ${imageId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "image_generation",
        sampledParams: params,
        chartData,
      };
    }

    // 3. GENERATE question with Claude
    console.log("  Stage 3: Generating question with Claude...");
    let question: GeneratedQuestion;
    try {
      question = await generateQuestionWithClaude(anthropic, params, chartData);
      console.log(`    Question: "${question.questionStem.slice(0, 60)}..."`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "question_generation",
        sampledParams: params,
        chartData,
        imageId,
      };
    }

    // 4. STORE in database
    console.log("  Stage 4: Storing question...");
    try {
      // Combine passage and question stem for the prompt
      const fullPrompt = `${question.passage}\n\n${question.questionStem}`;

      // Build RW difficulty factors based on sampled params
      const rwDifficulty = {
        passageComplexity: 0.4,
        inferenceDepth: params.claimStrength * 0.8,
        vocabularyLevel: 0.5,
        evidenceEvaluation: 0.7,
        synthesisRequired: params.questionPosition === "weaken_claim" ? 0.8 : 0.6,
      };

      const questionId = (await ctx.runMutation(
        internal.agentQuestions.createAgentQuestionInternal,
        {
          type: "multiple_choice" as const,
          category: "reading_writing" as const,
          domain: "information_and_ideas",
          skill: "command_of_evidence",
          prompt: fullPrompt,
          correctAnswer: "A",
          options: [
            { key: "A", content: question.choices.A, order: 0 },
            { key: "B", content: question.choices.B, order: 1 },
            { key: "C", content: question.choices.C, order: 2 },
            { key: "D", content: question.choices.D, order: 3 },
          ],
          explanation: question.explanation,
          wrongAnswerExplanations: question.distractorExplanations,
          rwDifficulty,
          figure: {
            imageId,
            figureType:
              dataType === "data_table" ? ("table" as const) : ("data_display" as const),
            caption: chartData.title,
          },
          generationMetadata: {
            generatedAt: Date.now(),
            agentVersion: "reading-data-v1",
            promptTemplate: "reading_data_question",
            promptParameters: params,
            verbalizedSampling: {
              targetDifficultyDistribution: [
                { factor: "claimStrength", mean: 0.6, stdDev: 0.2 },
              ],
              sampledValues: {
                ...params,
                rawChartData: chartData,
              },
            },
          },
          generationBatchId: batchId,
          tags: [
            "reading_writing",
            "information_and_ideas",
            "command_of_evidence",
            "data_interpretation",
            dataType,
            params.domain,
            params.claimType,
            "agent_generated",
          ],
        }
      )) as Id<"questions">;

      console.log(`  ✓ Success: Question ${questionId}`);

      return {
        success: true,
        questionId,
        imageId,
        sampledParams: params,
        chartData,
        chartTitle: chartData.title,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "storage",
        sampledParams: params,
        chartData,
        imageId,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`  ✗ Error: ${errorMsg}`);

    return {
      success: false,
      error: errorMsg,
      errorStage: "data_generation",
      sampledParams: params,
      chartData,
    };
  }
}

// ─────────────────────────────────────────────────────────
// EXPORTED ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Generate a single reading question with visual data.
 * Full pipeline: sample → data → image → question → store.
 */
export const generateReadingDataQuestion = internalAction({
  args: {
    dataType: v.union(
      v.literal("bar_chart"),
      v.literal("line_graph"),
      v.literal("data_table")
    ),
    // Optional: override sampled parameters
    overrideParams: v.optional(
      v.object({
        claimType: v.optional(
          v.union(
            v.literal("causal"),
            v.literal("correlational"),
            v.literal("comparative"),
            v.literal("trend-based")
          )
        ),
        domain: v.optional(
          v.union(
            v.literal("science"),
            v.literal("economics"),
            v.literal("social_science"),
            v.literal("health"),
            v.literal("environment")
          )
        ),
      })
    ),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`\nGenerating reading data question (${args.dataType})...`);

    const anthropic = getAnthropicClient();
    const gemini = getGeminiClient();

    // Sample verbalized parameters
    let params = sampleQuestionParams();

    // Apply any overrides
    if (args.overrideParams) {
      if (args.overrideParams.claimType) {
        params.claimType = args.overrideParams.claimType;
      }
      if (args.overrideParams.domain) {
        params.domain = args.overrideParams.domain as DataDomain;
      }
    }

    console.log(`  Sampled params:`, {
      claimType: params.claimType,
      claimStrength: params.claimStrength.toFixed(2),
      targetDataPoint: params.targetDataPoint,
      questionPosition: params.questionPosition,
      domain: params.domain,
    });

    return await generateSingleQuestion(
      ctx,
      anthropic,
      gemini,
      args.dataType,
      params,
      args.batchId
    );
  },
});

/**
 * Generate multiple reading data questions in batch.
 */
export const batchGenerateReadingDataQuestions = internalAction({
  args: {
    count: v.number(),
    dataTypes: v.optional(
      v.array(
        v.union(
          v.literal("bar_chart"),
          v.literal("line_graph"),
          v.literal("data_table")
        )
      )
    ),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dataTypes = args.dataTypes ?? ["bar_chart", "line_graph", "data_table"];
    const batchId = args.batchId ?? `reading-data-${Date.now()}`;

    console.log(
      `\nStarting batch generation of ${args.count} reading data questions...`
    );
    console.log(`  Batch ID: ${batchId}`);
    console.log(`  Data types: ${dataTypes.join(", ")}`);

    const anthropic = getAnthropicClient();
    const gemini = getGeminiClient();

    const results: Array<{
      index: number;
      success: boolean;
      questionId?: string;
      dataType?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < args.count; i++) {
      // Rotate through data types
      const dataType = dataTypes[i % dataTypes.length] as DataType;

      console.log(`\n[${i + 1}/${args.count}] Generating ${dataType}...`);

      // Sample fresh parameters for each question
      const params = sampleQuestionParams();

      console.log(`  Sampled params:`, {
        claimType: params.claimType,
        claimStrength: params.claimStrength.toFixed(2),
        targetDataPoint: params.targetDataPoint,
        questionPosition: params.questionPosition,
        domain: params.domain,
      });

      const result = await generateSingleQuestion(
        ctx,
        anthropic,
        gemini,
        dataType,
        params,
        batchId
      );

      if (result.success) {
        results.push({
          index: i,
          success: true,
          questionId: result.questionId?.toString(),
          dataType,
        });
      } else {
        // Add to DLQ for retry
        console.log(`  Adding to DLQ for retry...`);
        await ctx.runMutation(internal.readingDataDLQ.addToDLQ, {
          dataType,
          sampledParams: {
            claimType: params.claimType,
            claimStrength: params.claimStrength,
            targetDataPoint: params.targetDataPoint,
            questionPosition: params.questionPosition,
            distractorStrategies: params.distractorStrategies,
            domain: params.domain,
          },
          chartData: result.chartData,
          batchId,
          error: result.error ?? "Unknown error",
          errorStage: result.errorStage ?? "data_generation",
        });

        results.push({
          index: i,
          success: false,
          dataType,
          error: result.error,
        });
      }

      // Rate limiting between questions
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n========================================`);
    console.log(`Batch generation complete`);
    console.log(`  Successful: ${successful}/${args.count}`);
    console.log(`  Failed: ${failed}/${args.count} (added to DLQ)`);
    console.log(`========================================\n`);

    return {
      batchId,
      total: args.count,
      successful,
      failed,
      results,
    };
  },
});

// ─────────────────────────────────────────────────────────
// DLQ RETRY
// ─────────────────────────────────────────────────────────

/**
 * Retry failed items from the DLQ.
 */
export const retryDLQItems = internalAction({
  args: {
    dlqIds: v.array(v.id("readingDataDLQ")),
  },
  handler: async (ctx, args) => {
    console.log(`\nRetrying ${args.dlqIds.length} DLQ items...`);

    const anthropic = getAnthropicClient();
    const gemini = getGeminiClient();

    let succeeded = 0;
    let failed = 0;

    for (const dlqId of args.dlqIds) {
      // Get the DLQ item
      const item = await ctx.runQuery(internal.readingDataDLQ.getItemById, {
        dlqId,
      });

      if (!item) {
        console.log(`  DLQ item ${dlqId} not found, skipping`);
        continue;
      }

      // Mark as retrying
      await ctx.runMutation(internal.readingDataDLQ.markRetrying, { dlqId });

      console.log(
        `\nRetrying: ${item.dataType} (attempt ${item.retryCount + 1}/${item.maxRetries})`
      );

      // Reconstruct params
      const params: SampledQuestionParams = {
        claimType: item.sampledParams.claimType as SampledQuestionParams["claimType"],
        claimStrength: item.sampledParams.claimStrength,
        targetDataPoint: item.sampledParams.targetDataPoint as SampledQuestionParams["targetDataPoint"],
        questionPosition: item.sampledParams.questionPosition as SampledQuestionParams["questionPosition"],
        distractorStrategies: item.sampledParams.distractorStrategies as SampledQuestionParams["distractorStrategies"],
        domain: item.sampledParams.domain as SampledQuestionParams["domain"],
      };

      // Retry the generation (pass existing chartData if available)
      const result = await generateSingleQuestion(
        ctx,
        anthropic,
        gemini,
        item.dataType as DataType,
        params,
        item.batchId,
        item.chartData as ChartData | undefined
      );

      if (result.success && result.questionId && result.imageId) {
        // Mark as succeeded
        await ctx.runMutation(internal.readingDataDLQ.markSucceeded, {
          dlqId,
          imageId: result.imageId,
          questionId: result.questionId,
        });
        console.log(`  ✓ Success: ${result.questionId}`);
        succeeded++;
      } else {
        // Mark as failed
        const failResult = await ctx.runMutation(
          internal.readingDataDLQ.markFailed,
          {
            dlqId,
            error: result.error ?? "Unknown error",
            errorStage: result.errorStage ?? "data_generation",
            chartData: result.chartData,
          }
        );

        if (failResult.isPermanentFailure) {
          console.log(
            `  ✗ Permanently failed after ${item.maxRetries} attempts`
          );
        } else {
          console.log(`  ✗ Failed, will retry`);
        }
        failed++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log(`\nDLQ retry complete: ${succeeded} succeeded, ${failed} failed`);
    return { succeeded, failed };
  },
});
