"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "./_generated/dataModel";

import {
  sampleReadingQuestionParams,
  computeRwDifficulty,
  computeOverallDifficulty,
  type SampledReadingParams,
  type QuestionType,
  QUESTION_TYPES,
  QUESTION_TYPE_DISTRIBUTION,
  READING_DISTRACTOR_STRATEGIES,
} from "./readingQuestionTemplates";

import {
  buildPassageGenerationPrompt,
  buildQuestionGenerationPrompt,
  buildDistractorInstructions,
  QUESTION_TYPE_PROMPTS,
} from "./readingQuestionPrompts";

// Error stage types for DLQ
type ErrorStage = "passage_generation" | "question_generation" | "storage";

// ─────────────────────────────────────────────────────────
// READING QUESTION GENERATION PIPELINE
// ─────────────────────────────────────────────────────────
// Pipeline: Sample params → Generate passage → Generate question → Store
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

// ─────────────────────────────────────────────────────────
// GENERATED DATA INTERFACES
// ─────────────────────────────────────────────────────────

interface GeneratedPassage {
  passage: string;
  title: string | null;
  author: string;
  source: string;
  paragraphPurposes: string[];
  testableVocabulary: Array<{
    word: string;
    sentenceContext: string;
    contextualMeaning: string;
    alternativeMeanings: string[];
  }>;
  keyInferences: string[];
  mainIdea: string;
  authorPurpose: string;
}

interface GeneratedQuestion {
  questionStem: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation: string;
  distractorExplanations: {
    B: string;
    C: string;
    D: string;
  };
  // For vocabulary questions
  targetWord?: string;
  targetSentence?: string;
  // For evidence questions
  claim?: string;
  // For text structure
  targetElement?: string;
  // For rhetorical synthesis
  passageWithBlank?: string;
}

// ─────────────────────────────────────────────────────────
// STAGE 1: PASSAGE GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate an SAT-style passage using Claude.
 */
async function generatePassageWithClaude(
  anthropic: Anthropic,
  params: SampledReadingParams
): Promise<GeneratedPassage> {
  const prompt = buildPassageGenerationPrompt(params);

  console.log(`  Generating ${params.passageType} passage (complexity: ${params.passageComplexity.toFixed(2)})...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for passage generation");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const passage = JSON.parse(jsonMatch[0]) as GeneratedPassage;

  // Validate required fields
  if (!passage.passage || !passage.mainIdea || !passage.authorPurpose) {
    throw new Error("Generated passage missing required fields");
  }

  console.log(`    Generated: "${passage.title || 'Untitled'}" by ${passage.author}`);
  console.log(`    Length: ~${passage.passage.split(/\s+/).length} words`);

  return passage;
}

// ─────────────────────────────────────────────────────────
// STAGE 2: QUESTION GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate a question using Claude based on the passage and sampled params.
 */
async function generateQuestionWithClaude(
  anthropic: Anthropic,
  passage: GeneratedPassage,
  params: SampledReadingParams
): Promise<GeneratedQuestion> {
  const prompt = buildQuestionGenerationPrompt(
    params.questionType,
    passage.passage,
    {
      mainIdea: passage.mainIdea,
      authorPurpose: passage.authorPurpose,
      paragraphPurposes: passage.paragraphPurposes,
      keyInferences: passage.keyInferences,
      testableVocabulary: passage.testableVocabulary,
    },
    params.distractorStrategies
  );

  console.log(`  Generating ${params.questionType} question...`);

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

  // Ensure correctAnswer is set (default to A)
  if (!question.correctAnswer) {
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
  passageId?: Id<"passages">;
  error?: string;
  errorStage?: ErrorStage;
  sampledParams: SampledReadingParams;
  passage?: GeneratedPassage;
}

/**
 * Core logic for generating a single reading question.
 * Used by both single and batch generation.
 */
async function generateSingleQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  anthropic: Anthropic,
  params: SampledReadingParams,
  batchId?: string
): Promise<GenerationResult> {
  let passage: GeneratedPassage | undefined;
  let passageId: Id<"passages"> | undefined;

  try {
    // 1. GENERATE passage with Claude
    console.log("  Stage 1: Generating passage with Claude...");
    try {
      passage = await generatePassageWithClaude(anthropic, params);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "passage_generation",
        sampledParams: params,
      };
    }

    // 2. GENERATE question with Claude
    console.log("  Stage 2: Generating question with Claude...");
    let question: GeneratedQuestion;
    try {
      question = await generateQuestionWithClaude(anthropic, passage, params);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "question_generation",
        sampledParams: params,
        passage,
      };
    }

    // 3. STORE in database
    console.log("  Stage 3: Storing passage and question...");
    try {
      // First, create the passage
      passageId = (await ctx.runMutation(internal.passages.createPassageInternal, {
        title: passage.title || undefined,
        author: passage.author,
        content: passage.passage,
        source: passage.source,
        passageType: params.passageType,
        complexity: params.passageComplexity,
        analyzedFeatures: {
          paragraphPurposes: passage.paragraphPurposes,
          testableVocabulary: passage.testableVocabulary.map((v) => ({
            word: v.word,
            contextualMeaning: v.contextualMeaning,
          })),
          keyInferences: passage.keyInferences,
          mainIdea: passage.mainIdea,
          authorPurpose: passage.authorPurpose,
        },
      })) as Id<"passages">;

      // Build the full prompt (passage + question)
      const fullPrompt = question.questionStem;

      // Compute difficulty
      const rwDifficulty = computeRwDifficulty(params);
      const overallDifficulty = computeOverallDifficulty(params);
      const legacyDifficulty = overallDifficulty < 0.33 ? 1 : overallDifficulty < 0.67 ? 2 : 3;

      // Map question type to domain and skill
      const { domain, skill } = mapQuestionTypeToDomainSkill(params.questionType);

      // Create the question
      const questionId = (await ctx.runMutation(
        internal.agentQuestions.createAgentQuestionInternal,
        {
          type: "multiple_choice" as const,
          category: "reading_writing" as const,
          domain,
          skill,
          difficulty: legacyDifficulty,
          overallDifficulty,
          prompt: fullPrompt,
          passageId,
          correctAnswer: question.correctAnswer,
          options: [
            { key: "A", content: question.choices.A, order: 0 },
            { key: "B", content: question.choices.B, order: 1 },
            { key: "C", content: question.choices.C, order: 2 },
            { key: "D", content: question.choices.D, order: 3 },
          ],
          explanation: question.explanation,
          wrongAnswerExplanations: question.distractorExplanations,
          rwDifficulty,
          generationMetadata: {
            generatedAt: Date.now(),
            agentVersion: "reading-question-v1",
            promptTemplate: `reading_${params.questionType}`,
            promptParameters: params,
            verbalizedSampling: {
              targetDifficultyDistribution: [
                { factor: "passageComplexity", mean: 0.5, stdDev: 0.2 },
                { factor: "inferenceDepth", mean: 0.5, stdDev: 0.25 },
              ],
              sampledValues: {
                ...params,
                passageAnalysis: {
                  mainIdea: passage.mainIdea,
                  authorPurpose: passage.authorPurpose,
                  keyInferences: passage.keyInferences,
                },
              },
            },
          },
          generationBatchId: batchId,
          tags: [
            "reading_writing",
            domain,
            skill,
            params.questionType,
            params.passageType,
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
        passage,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        errorStage: "storage",
        sampledParams: params,
        passage,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`  ✗ Error: ${errorMsg}`);

    return {
      success: false,
      error: errorMsg,
      errorStage: "passage_generation",
      sampledParams: params,
      passage,
    };
  }
}

/**
 * Map question type to SAT domain and skill.
 */
function mapQuestionTypeToDomainSkill(questionType: QuestionType): {
  domain: string;
  skill: string;
} {
  const mapping: Record<QuestionType, { domain: string; skill: string }> = {
    central_ideas: {
      domain: "information_and_ideas",
      skill: "central_ideas",
    },
    inferences: {
      domain: "information_and_ideas",
      skill: "inferences",
    },
    vocabulary_in_context: {
      domain: "craft_and_structure",
      skill: "vocabulary_in_context",
    },
    text_structure: {
      domain: "craft_and_structure",
      skill: "text_structure_and_purpose",
    },
    command_of_evidence: {
      domain: "information_and_ideas",
      skill: "command_of_evidence",
    },
    rhetorical_synthesis: {
      domain: "craft_and_structure",
      skill: "rhetorical_synthesis",
    },
  };

  return mapping[questionType];
}

// ─────────────────────────────────────────────────────────
// EXPORTED ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Generate a single reading question.
 * Full pipeline: sample → passage → question → store.
 */
export const generateReadingQuestion = internalAction({
  args: {
    questionType: v.optional(
      v.union(
        v.literal("central_ideas"),
        v.literal("inferences"),
        v.literal("vocabulary_in_context"),
        v.literal("text_structure"),
        v.literal("command_of_evidence"),
        v.literal("rhetorical_synthesis")
      )
    ),
    passageType: v.optional(
      v.union(
        v.literal("literary_narrative"),
        v.literal("social_science"),
        v.literal("natural_science"),
        v.literal("humanities")
      )
    ),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`\nGenerating reading question...`);

    const anthropic = getAnthropicClient();

    // Sample verbalized parameters with any overrides
    const params = sampleReadingQuestionParams({
      questionType: args.questionType,
      passageType: args.passageType,
    });

    console.log(`  Sampled params:`, {
      questionType: params.questionType,
      passageType: params.passageType,
      passageLength: params.passageLength,
      passageComplexity: params.passageComplexity.toFixed(2),
      inferenceDepth: params.inferenceDepth.toFixed(2),
    });

    return await generateSingleQuestion(ctx, anthropic, params, args.batchId);
  },
});

/**
 * Generate multiple reading questions in batch.
 */
export const batchGenerateReadingQuestions = internalAction({
  args: {
    count: v.number(),
    questionTypes: v.optional(
      v.array(
        v.union(
          v.literal("central_ideas"),
          v.literal("inferences"),
          v.literal("vocabulary_in_context"),
          v.literal("text_structure"),
          v.literal("command_of_evidence"),
          v.literal("rhetorical_synthesis")
        )
      )
    ),
    passageTypes: v.optional(
      v.array(
        v.union(
          v.literal("literary_narrative"),
          v.literal("social_science"),
          v.literal("natural_science"),
          v.literal("humanities")
        )
      )
    ),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchId = args.batchId ?? `reading-${Date.now()}`;

    console.log(
      `\nStarting batch generation of ${args.count} reading questions...`
    );
    console.log(`  Batch ID: ${batchId}`);
    if (args.questionTypes) {
      console.log(`  Question types: ${args.questionTypes.join(", ")}`);
    }
    if (args.passageTypes) {
      console.log(`  Passage types: ${args.passageTypes.join(", ")}`);
    }

    const anthropic = getAnthropicClient();

    const results: Array<{
      index: number;
      success: boolean;
      questionId?: string;
      questionType?: string;
      passageType?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < args.count; i++) {
      // Determine question type for this iteration
      let questionType: QuestionType | undefined;
      if (args.questionTypes && args.questionTypes.length > 0) {
        // Rotate through specified types
        questionType = args.questionTypes[i % args.questionTypes.length] as QuestionType;
      }

      // Sample fresh parameters for each question
      const params = sampleReadingQuestionParams({
        questionType,
        passageType: args.passageTypes
          ? (args.passageTypes[i % args.passageTypes.length] as SampledReadingParams["passageType"])
          : undefined,
      });

      console.log(`\n[${i + 1}/${args.count}] Generating ${params.questionType} (${params.passageType})...`);
      console.log(`  Sampled params:`, {
        passageComplexity: params.passageComplexity.toFixed(2),
        inferenceDepth: params.inferenceDepth.toFixed(2),
        distractorStrategies: params.distractorStrategies,
      });

      const result = await generateSingleQuestion(ctx, anthropic, params, batchId);

      if (result.success) {
        results.push({
          index: i,
          success: true,
          questionId: result.questionId?.toString(),
          questionType: params.questionType,
          passageType: params.passageType,
        });
      } else {
        // Add to DLQ for retry
        console.log(`  Adding to DLQ for retry...`);
        try {
          await ctx.runMutation(internal.readingQuestionDLQ.addToDLQ, {
            questionType: params.questionType,
            passageType: params.passageType,
            sampledParams: {
              questionType: params.questionType,
              questionFocus: params.questionFocus,
              passageType: params.passageType,
              passageLength: params.passageLength,
              passageComplexity: params.passageComplexity,
              inferenceDepth: params.inferenceDepth,
              vocabularyLevel: params.vocabularyLevel,
              evidenceEvaluation: params.evidenceEvaluation,
              synthesisRequired: params.synthesisRequired,
              distractorStrategies: params.distractorStrategies,
              targetOverallDifficulty: params.targetOverallDifficulty,
            },
            passageData: result.passage
              ? {
                  passage: result.passage.passage,
                  title: result.passage.title,
                  author: result.passage.author,
                  mainIdea: result.passage.mainIdea,
                }
              : undefined,
            batchId,
            error: result.error ?? "Unknown error",
            errorStage: result.errorStage ?? "passage_generation",
          });
        } catch (dlqError) {
          console.error("  Failed to add to DLQ:", dlqError);
        }

        results.push({
          index: i,
          success: false,
          questionType: params.questionType,
          passageType: params.passageType,
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
    dlqIds: v.array(v.id("readingQuestionDLQ")),
  },
  handler: async (ctx, args) => {
    console.log(`\nRetrying ${args.dlqIds.length} DLQ items...`);

    const anthropic = getAnthropicClient();

    let succeeded = 0;
    let failed = 0;

    for (const dlqId of args.dlqIds) {
      // Get the DLQ item
      const item = await ctx.runQuery(internal.readingQuestionDLQ.getItemById, {
        dlqId,
      });

      if (!item) {
        console.log(`  DLQ item ${dlqId} not found, skipping`);
        continue;
      }

      // Mark as retrying
      await ctx.runMutation(internal.readingQuestionDLQ.markRetrying, { dlqId });

      console.log(
        `\nRetrying: ${item.questionType} (${item.passageType}) - attempt ${item.retryCount + 1}/${item.maxRetries}`
      );

      // Reconstruct params
      const params: SampledReadingParams = {
        questionType: item.sampledParams.questionType as QuestionType,
        questionFocus: item.sampledParams.questionFocus as SampledReadingParams["questionFocus"],
        passageType: item.sampledParams.passageType as SampledReadingParams["passageType"],
        passageLength: item.sampledParams.passageLength as SampledReadingParams["passageLength"],
        passageComplexity: item.sampledParams.passageComplexity,
        inferenceDepth: item.sampledParams.inferenceDepth,
        vocabularyLevel: item.sampledParams.vocabularyLevel,
        evidenceEvaluation: item.sampledParams.evidenceEvaluation,
        synthesisRequired: item.sampledParams.synthesisRequired,
        distractorStrategies: item.sampledParams.distractorStrategies as SampledReadingParams["distractorStrategies"],
        targetOverallDifficulty: item.sampledParams.targetOverallDifficulty,
      };

      // Retry the generation
      const result = await generateSingleQuestion(
        ctx,
        anthropic,
        params,
        item.batchId
      );

      if (result.success && result.questionId) {
        // Mark as succeeded
        await ctx.runMutation(internal.readingQuestionDLQ.markSucceeded, {
          dlqId,
          passageId: result.passageId!,
          questionId: result.questionId,
        });
        console.log(`  ✓ Success: ${result.questionId}`);
        succeeded++;
      } else {
        // Mark as failed
        const failResult = await ctx.runMutation(
          internal.readingQuestionDLQ.markFailed,
          {
            dlqId,
            error: result.error ?? "Unknown error",
            errorStage: result.errorStage ?? "passage_generation",
            passageData: result.passage
              ? {
                  passage: result.passage.passage,
                  title: result.passage.title,
                  author: result.passage.author,
                  mainIdea: result.passage.mainIdea,
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
