"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "./_generated/dataModel";

import {
  sampleTransitionParams,
  computeTransitionsRwDifficulty,
  type SampledTransitionParams,
} from "./transitionsTemplates";

import { getTransitionsPrompt } from "./transitionsPrompts";

// ─────────────────────────────────────────────────────────
// TRANSITIONS QUESTION GENERATION PIPELINE
// ─────────────────────────────────────────────────────────
// Pipeline: Sample params → Generate short passage + question → Store

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

interface GeneratedTransitionsQuestion {
  passageWithBlank: string; // Full passage with _____ for transition
  questionStem: string; // "Which choice completes the text with the most logical transition?"
  correctAnswer: string;
  choices: {
    A: string; // Transition word/phrase
    B: string;
    C: string;
    D: string;
  };
  explanation: string;
  sentenceBefore?: string; // Optional: sentence before transition
  sentenceAfter?: string; // Optional: sentence after transition
}

// ─────────────────────────────────────────────────────────
// QUESTION GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate a transitions question using Claude.
 */
async function generateTransitionsQuestionWithClaude(
  anthropic: Anthropic,
  params: SampledTransitionParams
): Promise<GeneratedTransitionsQuestion> {
  // Get the verbalized prompt for this transitions question
  const prompt = getTransitionsPrompt(params);

  console.log(`  Generating transitions question (difficulty: ${params.targetOverallDifficulty.toFixed(2)})...`);
  console.log(`    Topic: ${params.topicCategory}`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for transitions question generation");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const question = JSON.parse(jsonMatch[0]) as GeneratedTransitionsQuestion;

  // Validate required fields
  if (!question.passageWithBlank || !question.questionStem || !question.choices) {
    throw new Error("Generated transitions question missing required fields");
  }

  // Ensure correctAnswer is set (default to B, since that's where correct transition usually goes)
  if (!question.correctAnswer) {
    question.correctAnswer = "B";
  }

  console.log(`    Passage: "${question.passageWithBlank.slice(0, 80)}..."`);

  return question;
}

// ─────────────────────────────────────────────────────────
// CORE GENERATION LOGIC
// ─────────────────────────────────────────────────────────

interface GenerationResult {
  success: boolean;
  questionId?: Id<"questions">;
  passageId?: Id<"passages">;
  error?: string;
  sampledParams: SampledTransitionParams;
}

/**
 * Core logic for generating a single transitions question.
 */
async function generateSingleTransitionsQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  anthropic: Anthropic,
  params: SampledTransitionParams,
  batchId?: string
): Promise<GenerationResult> {
  try {
    // 1. GENERATE question with Claude
    console.log("  Stage 1: Generating transitions question with Claude...");
    let question: GeneratedTransitionsQuestion;
    try {
      question = await generateTransitionsQuestionWithClaude(anthropic, params);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        sampledParams: params,
      };
    }

    // 2. STORE in database
    console.log("  Stage 2: Storing passage and question...");
    try {
      // Create the passage (short passage with blank)
      const passageId = (await ctx.runMutation(internal.passages.createPassageInternal, {
        title: "Transitions Exercise",
        author: "Generated",
        content: question.passageWithBlank,
        source: "Transitions question",
        passageType: "social_science", // Default type for transitions
        complexity: params.sentenceComplexity,
        analyzedFeatures: {
          paragraphPurposes: ["Tests logical transition between ideas"],
          testableVocabulary: [],
          keyInferences: [],
          mainIdea: "Transition exercise",
          authorPurpose: "Test logical connectors",
        },
      })) as Id<"passages">;

      // Map to domain and skill
      const domain = "expression_of_ideas";
      const skill = "transitions";

      // FIXED: Compute proper rwDifficulty using all sampled factors
      const rwDifficulty = computeTransitionsRwDifficulty(params);

      // Shuffle answer choices so correct answer isn't always A
      const { shuffledChoices, newCorrectAnswer } = shuffleAnswerChoices(
        question.choices,
        question.correctAnswer
      );
      console.log(`    Shuffled: correct answer is now ${newCorrectAnswer}`);

      // Create the question
      const questionId = (await ctx.runMutation(
        internal.agentQuestions.createAgentQuestionInternal,
        {
          type: "multiple_choice" as const,
          category: "reading_writing" as const,
          domain,
          skill,
          prompt: question.questionStem,
          passageId,
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
            agentVersion: "transitions-v2",
            promptTemplate: "transitions",
            promptParameters: params,
            verbalizedSampling: {
              targetDifficultyDistribution: [
                { factor: "sentenceComplexity", mean: 0.5, stdDev: 0.2 },
                { factor: "relationshipSubtlety", mean: 0.5, stdDev: 0.25 },
              ],
              sampledValues: params,
            },
          },
          generationBatchId: batchId,
          tags: [
            "reading_writing",
            domain,
            skill,
            "transitions",
            params.topicCategory,
            "agent_generated",
          ],
        }
      )) as Id<"questions">;

      console.log(`  ✓ Success: Question ${questionId}`);

      return {
        success: true,
        questionId,
        passageId,
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
 * Generate a single transitions question.
 */
export const generateTransitionsQuestion = internalAction({
  args: {
    targetDifficulty: v.optional(v.number()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`\nGenerating transitions question...`);

    const anthropic = getAnthropicClient();

    // Sample parameters with any overrides
    const params = sampleTransitionParams({
      targetOverallDifficulty: args.targetDifficulty,
    });

    console.log(`  Sampled params:`, {
      topicCategory: params.topicCategory,
      sentenceComplexity: params.sentenceComplexity.toFixed(2),
      targetDifficulty: params.targetOverallDifficulty.toFixed(2),
    });

    return await generateSingleTransitionsQuestion(ctx, anthropic, params, args.batchId);
  },
});

/**
 * Generate multiple transitions questions in batch.
 */
export const batchGenerateTransitionsQuestions = internalAction({
  args: {
    count: v.number(),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchId = args.batchId ?? `transitions-${Date.now()}`;

    console.log(
      `\nStarting batch generation of ${args.count} transitions questions...`
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
      const params = sampleTransitionParams();

      console.log(`\n[${i + 1}/${args.count}] Generating transitions (difficulty: ${params.targetOverallDifficulty.toFixed(2)})...`);

      const result = await generateSingleTransitionsQuestion(ctx, anthropic, params, batchId);

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
