"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { Id } from "./_generated/dataModel";

import {
  sampleMathQuestionParams,
  computeMathDifficulty,
  type SampledMathParams,
  type MathDomain,
  type MathSkill,
} from "./mathQuestionTemplates";

import {
  buildMathProblemPrompt,
  buildMathQuestionPrompt,
} from "./mathQuestionPrompts";

import {
  buildMathFigurePrompt,
  type MathFigureData,
  validateMathFigureData,
} from "./mathFigureImagePrompts";

// Error stage types for DLQ
type ErrorStage = "problem_generation" | "figure_generation" | "question_generation" | "storage";

// ─────────────────────────────────────────────────────────
// MATH QUESTION GENERATION PIPELINE
// ─────────────────────────────────────────────────────────
// Pipeline: Sample params → Generate problem → (optional) Generate figure → Generate question → Store
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
 * Get Google GenAI client from environment.
 */
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_STUDIO_API_KEY environment variable is required");
  }
  return new GoogleGenAI({ apiKey });
}

// ─────────────────────────────────────────────────────────
// GENERATED DATA INTERFACES
// ─────────────────────────────────────────────────────────

interface GeneratedProblem {
  problemText: string;
  givenInformation: string[];
  whatToFind: string;
  correctAnswer: string;
  solutionSteps: string[];
  keyConceptsTested: string[];
  figureDescription: string | null;
  figureData: MathFigureData | null;
}

interface GeneratedQuestion {
  questionStem: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  wrongAnswerExplanations: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
}

// ─────────────────────────────────────────────────────────
// STAGE 1: PROBLEM GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate a math problem using Claude.
 */
async function generateProblemWithClaude(
  anthropic: Anthropic,
  params: SampledMathParams
): Promise<GeneratedProblem> {
  const prompt = buildMathProblemPrompt(params);

  console.log(`  Generating ${params.domain}/${params.skill} problem...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for problem generation");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const problem = JSON.parse(jsonMatch[0]) as GeneratedProblem;

  // Validate required fields
  if (!problem.problemText || !problem.correctAnswer || !problem.solutionSteps) {
    throw new Error("Generated problem missing required fields");
  }

  console.log(`    Problem: "${problem.problemText.slice(0, 60)}..."`);
  console.log(`    Answer: ${problem.correctAnswer}`);

  return problem;
}

// ─────────────────────────────────────────────────────────
// STAGE 2: FIGURE GENERATION (optional)
// ─────────────────────────────────────────────────────────

/**
 * Generate a figure using Gemini.
 */
async function generateFigureWithGemini(
  gemini: GoogleGenAI,
  params: SampledMathParams,
  problem: GeneratedProblem,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any
): Promise<{ imageId: Id<"images">; altText: string } | null> {
  if (params.figureType === "none" || !problem.figureData) {
    return null;
  }

  // Validate figure data
  if (!validateMathFigureData(problem.figureData)) {
    console.log("    Figure data invalid, skipping figure generation");
    return null;
  }

  const { prompt, altText } = buildMathFigurePrompt(params.figureType, problem.figureData);

  if (!prompt) {
    return null;
  }

  console.log(`  Generating ${params.figureType} figure with Gemini...`);

  const geminiResponse = await gemini.models.generateContent({
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
  const imagePart = geminiResponse.candidates?.[0]?.content?.parts?.find(
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
    altText: altText || "SAT math figure",
    aspectRatio: 4 / 3,
  })) as Id<"images">;

  console.log(`    Figure generated: ${imageId}`);

  return { imageId, altText };
}

// ─────────────────────────────────────────────────────────
// STAGE 3: QUESTION GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate a multiple-choice question from the problem.
 */
async function generateQuestionWithClaude(
  anthropic: Anthropic,
  problem: GeneratedProblem,
  params: SampledMathParams
): Promise<GeneratedQuestion> {
  const prompt = buildMathQuestionPrompt(
    {
      problemText: problem.problemText,
      givenInformation: problem.givenInformation,
      whatToFind: problem.whatToFind,
      correctAnswer: problem.correctAnswer,
      solutionSteps: problem.solutionSteps,
    },
    params.distractorStrategies
  );

  console.log(`  Generating multiple-choice question...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
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
  if (!question.questionStem || !question.choices || !question.explanation) {
    throw new Error("Generated question missing required fields");
  }

  // Ensure correctAnswer is valid
  if (!["A", "B", "C", "D"].includes(question.correctAnswer)) {
    question.correctAnswer = "A";
  }

  console.log(`    Question: "${question.questionStem.slice(0, 60)}..."`);

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
  sampledParams: SampledMathParams;
  problem?: GeneratedProblem;
}

/**
 * Core logic for generating a single math question.
 */
async function generateSingleMathQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  anthropic: Anthropic,
  gemini: GoogleGenAI,
  params: SampledMathParams,
  batchId?: string
): Promise<GenerationResult> {
  let problem: GeneratedProblem | undefined;
  let imageId: Id<"images"> | undefined;

  try {
    // 1. GENERATE problem with Claude
    console.log("  Stage 1: Generating problem with Claude...");
    try {
      problem = await generateProblemWithClaude(anthropic, params);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "problem_generation",
        sampledParams: params,
      };
    }

    // 2. GENERATE figure with Gemini (if needed)
    if (params.figureType !== "none") {
      console.log("  Stage 2: Generating figure with Gemini...");
      try {
        const figureResult = await generateFigureWithGemini(gemini, params, problem, ctx);
        if (figureResult) {
          imageId = figureResult.imageId;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: errorMsg,
          errorStage: "figure_generation",
          sampledParams: params,
          problem,
        };
      }
    }

    // 3. GENERATE question with Claude
    console.log("  Stage 3: Generating multiple-choice question...");
    let question: GeneratedQuestion;
    try {
      question = await generateQuestionWithClaude(anthropic, problem, params);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "question_generation",
        sampledParams: params,
        problem,
      };
    }

    // 4. STORE in database
    console.log("  Stage 4: Storing question...");
    try {
      // Compute difficulty factors
      const mathDifficulty = computeMathDifficulty(params);

      // Filter wrongAnswerExplanations to only include wrong answers
      const wrongAnswerExplanations: Record<string, string> = {};
      for (const [key, value] of Object.entries(question.wrongAnswerExplanations)) {
        if (key !== question.correctAnswer && value) {
          wrongAnswerExplanations[key] = value;
        }
      }

      // Build figure object if we have an image
      const figure = imageId
        ? {
            imageId,
            figureType: params.figureType === "coordinate_graph" ? "graph" as const : "geometric" as const,
          }
        : undefined;

      // Create the question
      const questionId = (await ctx.runMutation(
        internal.agentQuestions.createAgentQuestionInternal,
        {
          type: "multiple_choice" as const,
          category: "math" as const,
          domain: params.domain,
          skill: params.skill,
          prompt: question.questionStem,
          figure,
          correctAnswer: question.correctAnswer,
          options: [
            { key: "A", content: question.choices.A, order: 0 },
            { key: "B", content: question.choices.B, order: 1 },
            { key: "C", content: question.choices.C, order: 2 },
            { key: "D", content: question.choices.D, order: 3 },
          ],
          explanation: question.explanation,
          wrongAnswerExplanations,
          mathDifficulty,
          generationMetadata: {
            generatedAt: Date.now(),
            agentVersion: "math-question-v1",
            promptTemplate: `math_${params.domain}_${params.skill}`,
            promptParameters: params,
            verbalizedSampling: {
              targetDifficultyDistribution: [
                { factor: "algebraicComplexity", mean: 0.5, stdDev: 0.25 },
                { factor: "reasoningSteps", mean: 0.5, stdDev: 0.2 },
              ],
              sampledValues: {
                ...params,
                problemAnalysis: {
                  correctAnswer: problem.correctAnswer,
                  solutionSteps: problem.solutionSteps,
                  keyConceptsTested: problem.keyConceptsTested,
                },
              },
            },
          },
          generationBatchId: batchId,
          tags: [
            "math",
            params.domain,
            params.skill,
            params.contextType,
            params.figureType !== "none" ? "has_figure" : "no_figure",
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
        problem,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "storage",
        sampledParams: params,
        problem,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`  ✗ Error: ${errorMsg}`);

    return {
      success: false,
      error: errorMsg,
      errorStage: "problem_generation",
      sampledParams: params,
      problem,
    };
  }
}

// ─────────────────────────────────────────────────────────
// EXPORTED ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Generate a single math question.
 * Full pipeline: sample → problem → figure → question → store.
 */
export const generateMathQuestion = internalAction({
  args: {
    domain: v.optional(
      v.union(
        v.literal("algebra"),
        v.literal("advanced_math"),
        v.literal("problem_solving"),
        v.literal("geometry_trig")
      )
    ),
    skill: v.optional(v.string()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`\nGenerating math question...`);

    const anthropic = getAnthropicClient();
    const gemini = getGeminiClient();

    // Sample verbalized parameters with any overrides
    const params = sampleMathQuestionParams({
      domain: args.domain,
      skill: args.skill as MathSkill | undefined,
    });

    console.log(`  Sampled params:`, {
      domain: params.domain,
      skill: params.skill,
      figureType: params.figureType,
      contextType: params.contextType,
      algebraicComplexity: params.algebraicComplexity.toFixed(2),
      reasoningSteps: params.reasoningSteps.toFixed(2),
    });

    return await generateSingleMathQuestion(ctx, anthropic, gemini, params, args.batchId);
  },
});

/**
 * Generate multiple math questions in batch.
 */
export const batchGenerateMathQuestions = internalAction({
  args: {
    count: v.number(),
    domains: v.optional(
      v.array(
        v.union(
          v.literal("algebra"),
          v.literal("advanced_math"),
          v.literal("problem_solving"),
          v.literal("geometry_trig")
        )
      )
    ),
    skills: v.optional(v.array(v.string())),
    batchId: v.optional(v.string()),
    concurrency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchId = args.batchId ?? `math-${Date.now()}`;
    const CONCURRENCY = args.concurrency ?? 3; // Lower default for Gemini rate limits

    console.log(
      `\nStarting batch generation of ${args.count} math questions...`
    );
    console.log(`  Batch ID: ${batchId}`);
    console.log(`  Concurrency: ${CONCURRENCY}`);
    if (args.domains) {
      console.log(`  Domains: ${args.domains.join(", ")}`);
    }
    if (args.skills) {
      console.log(`  Skills: ${args.skills.join(", ")}`);
    }

    const anthropic = getAnthropicClient();
    const gemini = getGeminiClient();

    // Pre-generate all question parameters upfront
    const questionParams: Array<{
      index: number;
      params: SampledMathParams;
    }> = [];

    for (let i = 0; i < args.count; i++) {
      let domain: MathDomain | undefined;
      if (args.domains && args.domains.length > 0) {
        domain = args.domains[i % args.domains.length] as MathDomain;
      }

      let skill: MathSkill | undefined;
      if (args.skills && args.skills.length > 0) {
        skill = args.skills[i % args.skills.length] as MathSkill;
      }

      const params = sampleMathQuestionParams({
        domain,
        skill,
      });

      questionParams.push({ index: i, params });
    }

    console.log(`\nPre-generated ${questionParams.length} question parameters`);

    const results: Array<{
      index: number;
      success: boolean;
      questionId?: string;
      domain?: string;
      skill?: string;
      error?: string;
    }> = [];

    // Process in concurrent batches
    for (let batchStart = 0; batchStart < questionParams.length; batchStart += CONCURRENCY) {
      const batch = questionParams.slice(batchStart, batchStart + CONCURRENCY);
      const batchEnd = Math.min(batchStart + CONCURRENCY, questionParams.length);

      console.log(`\n[Batch ${Math.floor(batchStart / CONCURRENCY) + 1}/${Math.ceil(questionParams.length / CONCURRENCY)}] Processing questions ${batchStart + 1}-${batchEnd}...`);

      // Generate all questions in this batch concurrently
      const batchResults = await Promise.all(
        batch.map(async ({ index, params }) => {
          console.log(`  [${index + 1}/${args.count}] Starting ${params.domain}/${params.skill}...`);

          const result = await generateSingleMathQuestion(ctx, anthropic, gemini, params, batchId);

          return { index, params, result };
        })
      );

      // Process results from this batch
      for (const { index, params, result } of batchResults) {
        if (result.success) {
          console.log(`  [${index + 1}] ✓ Success`);
          results.push({
            index,
            success: true,
            questionId: result.questionId?.toString(),
            domain: params.domain,
            skill: params.skill,
          });
        } else {
          console.log(`  [${index + 1}] ✗ Failed: ${result.error}`);
          // Add to DLQ for retry
          try {
            await ctx.runMutation(internal.mathQuestionDLQ.addToDLQ, {
              domain: params.domain,
              skill: params.skill,
              sampledParams: {
                domain: params.domain,
                skill: params.skill,
                contextType: params.contextType,
                figureType: params.figureType,
                reasoningSteps: params.reasoningSteps,
                algebraicComplexity: params.algebraicComplexity,
                conceptualDepth: params.conceptualDepth,
                computationLoad: params.computationLoad,
                multiStepRequired: params.multiStepRequired,
                wordProblemComplexity: params.wordProblemComplexity,
                distractorStrategies: params.distractorStrategies,
                targetOverallDifficulty: params.targetOverallDifficulty,
              },
              problemData: result.problem
                ? {
                    problemText: result.problem.problemText,
                    correctAnswer: result.problem.correctAnswer,
                    solutionSteps: result.problem.solutionSteps,
                  }
                : undefined,
              batchId,
              error: result.error ?? "Unknown error",
              errorStage: result.errorStage ?? "problem_generation",
            });
          } catch (dlqError) {
            console.error(`  [${index + 1}] Failed to add to DLQ:`, dlqError);
          }

          results.push({
            index,
            success: false,
            domain: params.domain,
            skill: params.skill,
            error: result.error,
          });
        }
      }

      // Longer delay between batches due to Gemini rate limits
      if (batchStart + CONCURRENCY < questionParams.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
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
    dlqIds: v.array(v.id("mathQuestionDLQ")),
  },
  handler: async (ctx, args) => {
    console.log(`\nRetrying ${args.dlqIds.length} DLQ items...`);

    const anthropic = getAnthropicClient();
    const gemini = getGeminiClient();

    let succeeded = 0;
    let failed = 0;

    for (const dlqId of args.dlqIds) {
      // Get the DLQ item
      const item = await ctx.runQuery(internal.mathQuestionDLQ.getItemById, {
        dlqId,
      });

      if (!item) {
        console.log(`  DLQ item ${dlqId} not found, skipping`);
        continue;
      }

      // Mark as retrying
      await ctx.runMutation(internal.mathQuestionDLQ.markRetrying, { dlqId });

      console.log(
        `\nRetrying: ${item.domain}/${item.skill} - attempt ${item.retryCount + 1}/${item.maxRetries}`
      );

      // Reconstruct params
      const params: SampledMathParams = {
        domain: item.sampledParams.domain as MathDomain,
        skill: item.sampledParams.skill as MathSkill,
        contextType: item.sampledParams.contextType as SampledMathParams["contextType"],
        figureType: item.sampledParams.figureType as SampledMathParams["figureType"],
        reasoningSteps: item.sampledParams.reasoningSteps,
        algebraicComplexity: item.sampledParams.algebraicComplexity,
        conceptualDepth: item.sampledParams.conceptualDepth,
        computationLoad: item.sampledParams.computationLoad,
        multiStepRequired: item.sampledParams.multiStepRequired,
        wordProblemComplexity: item.sampledParams.wordProblemComplexity,
        distractorStrategies: item.sampledParams.distractorStrategies as SampledMathParams["distractorStrategies"],
        targetOverallDifficulty: item.sampledParams.targetOverallDifficulty,
      };

      // Retry the generation
      const result = await generateSingleMathQuestion(
        ctx,
        anthropic,
        gemini,
        params,
        item.batchId
      );

      if (result.success && result.questionId) {
        // Mark as succeeded
        await ctx.runMutation(internal.mathQuestionDLQ.markSucceeded, {
          dlqId,
          questionId: result.questionId,
          imageId: result.imageId,
        });
        console.log(`  ✓ Success: ${result.questionId}`);
        succeeded++;
      } else {
        // Mark as failed
        const failResult = await ctx.runMutation(
          internal.mathQuestionDLQ.markFailed,
          {
            dlqId,
            error: result.error ?? "Unknown error",
            errorStage: result.errorStage ?? "problem_generation",
            problemData: result.problem
              ? {
                  problemText: result.problem.problemText,
                  correctAnswer: result.problem.correctAnswer,
                  solutionSteps: result.problem.solutionSteps,
                }
              : undefined,
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`\nDLQ retry complete: ${succeeded} succeeded, ${failed} failed`);
    return { succeeded, failed };
  },
});
