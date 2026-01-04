"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "./_generated/dataModel";

import {
  sampleCrossTextParams,
  computeCrossTextRwDifficulty,
  type SampledCrossTextParams,
} from "./crossTextTemplates";

import { getCrossTextPrompt } from "./crossTextPrompts";

// ─────────────────────────────────────────────────────────
// CROSS-TEXT QUESTION GENERATION PIPELINE
// ─────────────────────────────────────────────────────────
// Pipeline: Sample params → Generate two passages + question → Store

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

// ─────────────────────────────────────────────────────────
// ANSWER SHUFFLING UTILITY
// ─────────────────────────────────────────────────────────

/**
 * Shuffle answer choices so the correct answer isn't always A.
 * Returns new choices object and updated correctAnswer key.
 */
function shuffleAnswerChoices(
  choices: { A: string; B: string; C: string; D: string },
  correctAnswer: string
): { shuffledChoices: { A: string; B: string; C: string; D: string }; newCorrectAnswer: string } {
  const keys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  const entries = keys.map((key) => ({ key, content: choices[key] }));

  // Fisher-Yates shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  // Find where the correct answer ended up
  const correctContent = choices[correctAnswer as keyof typeof choices];
  const newCorrectIndex = entries.findIndex((e) => e.content === correctContent);
  const newCorrectAnswer = keys[newCorrectIndex];

  // Build new choices object
  const shuffledChoices = {
    A: entries[0].content,
    B: entries[1].content,
    C: entries[2].content,
    D: entries[3].content,
  };

  return { shuffledChoices, newCorrectAnswer };
}

// ─────────────────────────────────────────────────────────
// GENERATED DATA INTERFACES
// ─────────────────────────────────────────────────────────

interface GeneratedCrossTextQuestion {
  text1: {
    content: string; // 50-100 words
    author: string;
    title?: string;
  };
  text2: {
    content: string; // 50-100 words
    author: string;
    title?: string;
  };
  questionStem: string;
  correctAnswer: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  explanation: string;
}

// ─────────────────────────────────────────────────────────
// QUESTION GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate a cross-text question using Claude.
 */
async function generateCrossTextQuestionWithClaude(
  anthropic: Anthropic,
  params: SampledCrossTextParams
): Promise<GeneratedCrossTextQuestion> {
  // Get the verbalized prompt for this cross-text question
  const prompt = getCrossTextPrompt(params);

  console.log(`  Generating cross-text question (difficulty: ${params.targetOverallDifficulty.toFixed(2)})...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for cross-text question generation");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const question = JSON.parse(jsonMatch[0]) as GeneratedCrossTextQuestion;

  // Validate required fields
  if (!question.text1 || !question.text2 || !question.questionStem || !question.choices) {
    throw new Error("Generated cross-text question missing required fields");
  }

  // Ensure correctAnswer is set (default to A)
  if (!question.correctAnswer) {
    question.correctAnswer = "A";
  }

  console.log(`    Text 1 length: ~${question.text1.content.split(/\s+/).length} words`);
  console.log(`    Text 2 length: ~${question.text2.content.split(/\s+/).length} words`);
  console.log(`    Topic: ${params.topicCategory}`);

  return question;
}

// ─────────────────────────────────────────────────────────
// CORE GENERATION LOGIC
// ─────────────────────────────────────────────────────────

interface GenerationResult {
  success: boolean;
  questionId?: Id<"questions">;
  passage1Id?: Id<"passages">;
  passage2Id?: Id<"passages">;
  error?: string;
  sampledParams: SampledCrossTextParams;
}

/**
 * Core logic for generating a single cross-text question.
 */
async function generateSingleCrossTextQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  anthropic: Anthropic,
  params: SampledCrossTextParams,
  batchId?: string
): Promise<GenerationResult> {
  try {
    // 1. GENERATE question with Claude (includes both passages)
    console.log("  Stage 1: Generating cross-text question with Claude...");
    let question: GeneratedCrossTextQuestion;
    try {
      question = await generateCrossTextQuestionWithClaude(anthropic, params);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        sampledParams: params,
      };
    }

    // 2. STORE in database
    console.log("  Stage 2: Storing passages and question...");
    try {
      // Create passage 1
      const passage1Id = (await ctx.runMutation(internal.passages.createPassageInternal, {
        title: question.text1.title || "Text 1",
        author: question.text1.author,
        content: question.text1.content,
        source: "Cross-text pair",
        passageType: params.passageType1,
        complexity: params.text1Complexity,
        analyzedFeatures: {
          paragraphPurposes: ["Presents first perspective"],
          testableVocabulary: [],
          keyInferences: [],
          mainIdea: "Text 1 content",
          authorPurpose: "Present viewpoint/information",
        },
      })) as Id<"passages">;

      // Create passage 2
      const passage2Id = (await ctx.runMutation(internal.passages.createPassageInternal, {
        title: question.text2.title || "Text 2",
        author: question.text2.author,
        content: question.text2.content,
        source: "Cross-text pair",
        passageType: params.passageType2,
        complexity: params.text2Complexity,
        analyzedFeatures: {
          paragraphPurposes: ["Presents second perspective"],
          testableVocabulary: [],
          keyInferences: [],
          mainIdea: "Text 2 content",
          authorPurpose: "Present related viewpoint/information",
        },
      })) as Id<"passages">;

      // Map to domain and skill
      const domain = "craft_and_structure";
      const skill = "cross_text_connections";

      // FIXED: Compute proper rwDifficulty using all sampled factors
      const rwDifficulty = computeCrossTextRwDifficulty(params);

      // Shuffle answer choices so correct answer isn't always A
      const { shuffledChoices, newCorrectAnswer } = shuffleAnswerChoices(
        question.choices,
        question.correctAnswer
      );
      console.log(`    Shuffled: correct answer is now ${newCorrectAnswer}`);

      // Create the question
      // Note: For cross-text, we'll use passage1Id as the primary passage
      // and store passage2Id in tags or metadata
      const questionId = (await ctx.runMutation(
        internal.agentQuestions.createAgentQuestionInternal,
        {
          type: "multiple_choice" as const,
          category: "reading_writing" as const,
          domain,
          skill,
          prompt: question.questionStem,
          passageId: passage1Id, // Primary passage
          correctAnswer: newCorrectAnswer,
          options: [
            { key: "A", content: shuffledChoices.A, order: 0 },
            { key: "B", content: shuffledChoices.B, order: 1 },
            { key: "C", content: shuffledChoices.C, order: 2 },
            { key: "D", content: shuffledChoices.D, order: 3 },
          ],
          explanation: question.explanation,
          rwDifficulty,
          generationMetadata: {
            generatedAt: Date.now(),
            agentVersion: "cross-text-v2",
            promptTemplate: "cross_text_connections",
            promptParameters: {
              ...params,
              passage2Id: passage2Id.toString(), // Store second passage reference
            },
            verbalizedSampling: {
              targetDifficultyDistribution: [
                { factor: "relationshipSubtlety", mean: 0.5, stdDev: 0.25 },
                { factor: "argumentComplexity", mean: 0.5, stdDev: 0.2 },
              ],
              sampledValues: params,
            },
          },
          generationBatchId: batchId,
          tags: [
            "reading_writing",
            domain,
            skill,
            "cross_text_connections",
            params.topicCategory,
            "agent_generated",
            `passage2:${passage2Id}`, // Tag with second passage ID
          ],
        }
      )) as Id<"questions">;

      console.log(`  ✓ Success: Question ${questionId}`);
      console.log(`    Passage 1: ${passage1Id}`);
      console.log(`    Passage 2: ${passage2Id}`);

      return {
        success: true,
        questionId,
        passage1Id,
        passage2Id,
        sampledParams: params,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        sampledParams: params,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`  ✗ Error: ${errorMsg}`);

    return {
      success: false,
      error: errorMsg,
      sampledParams: params,
    };
  }
}

// ─────────────────────────────────────────────────────────
// EXPORTED ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Generate a single cross-text question.
 */
export const generateCrossTextQuestion = internalAction({
  args: {
    targetDifficulty: v.optional(v.number()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`\nGenerating cross-text question...`);

    const anthropic = getAnthropicClient();

    // Sample parameters with any overrides
    const params = sampleCrossTextParams({
      targetOverallDifficulty: args.targetDifficulty,
    });

    console.log(`  Sampled params:`, {
      topicCategory: params.topicCategory,
      relationshipSubtlety: params.relationshipSubtlety.toFixed(2),
      targetDifficulty: params.targetOverallDifficulty.toFixed(2),
    });

    return await generateSingleCrossTextQuestion(ctx, anthropic, params, args.batchId);
  },
});

/**
 * Generate multiple cross-text questions in batch.
 */
export const batchGenerateCrossTextQuestions = internalAction({
  args: {
    count: v.number(),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchId = args.batchId ?? `cross-text-${Date.now()}`;

    console.log(
      `\nStarting batch generation of ${args.count} cross-text questions...`
    );
    console.log(`  Batch ID: ${batchId}`);

    const anthropic = getAnthropicClient();

    const results: Array<{
      index: number;
      success: boolean;
      questionId?: string;
      topicCategory?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < args.count; i++) {
      // Sample fresh parameters for each question
      const params = sampleCrossTextParams();

      console.log(`\n[${i + 1}/${args.count}] Generating cross-text (difficulty: ${params.targetOverallDifficulty.toFixed(2)})...`);

      const result = await generateSingleCrossTextQuestion(ctx, anthropic, params, batchId);

      if (result.success) {
        results.push({
          index: i,
          success: true,
          questionId: result.questionId?.toString(),
          topicCategory: params.topicCategory,
        });
      } else {
        results.push({
          index: i,
          success: false,
          topicCategory: params.topicCategory,
          error: result.error,
        });
      }

      // Rate limiting between questions
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n========================================`);
    console.log(`Batch generation complete`);
    console.log(`  Successful: ${successful}/${args.count}`);
    console.log(`  Failed: ${failed}/${args.count}`);
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
