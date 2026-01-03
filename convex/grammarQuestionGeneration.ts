"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "./_generated/dataModel";

import {
  sampleGrammarParams,
  type SampledGrammarParams,
} from "./grammarConventionsTemplates";

import {
  PROMPT_GENERATORS,
  generateSubjectVerbAgreementPrompt,
  generatePronounAgreementPrompt,
  generateVerbFinitenessPrompt,
  generateVerbTensePrompt,
  generateModifierPlacementPrompt,
  generateGenitivesPluralsPrompt,
  generateBoundariesBetweenPrompt,
  generateBoundariesWithinPrompt,
} from "./newQuestionTypePrompts";

// ─────────────────────────────────────────────────────────
// GRAMMAR QUESTION GENERATION PIPELINE
// ─────────────────────────────────────────────────────────
// Pipeline: Sample params → Generate question → Store
// Grammar questions don't need passages - just sentences with grammar decisions.

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

interface GeneratedGrammarQuestion {
  sentenceWithUnderline: string; // Full sentence with [underlined] portion marked
  underlinedPortion: string; // The portion being tested
  questionStem: string; // Usually "Which choice completes the text so that it conforms to the conventions of Standard English?"
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation: string;
  grammarRule: string; // The rule being tested
}

// ─────────────────────────────────────────────────────────
// QUESTION GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Generate a grammar question using Claude.
 */
async function generateGrammarQuestionWithClaude(
  anthropic: Anthropic,
  params: SampledGrammarParams
): Promise<GeneratedGrammarQuestion> {
  // Get the appropriate prompt generator
  const promptGenerator = PROMPT_GENERATORS[params.questionType];
  if (!promptGenerator) {
    throw new Error(`No prompt generator for question type: ${params.questionType}`);
  }

  const prompt = promptGenerator(params);

  console.log(`  Generating ${params.questionType} question (${params.patternType})...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for grammar question generation");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const question = JSON.parse(jsonMatch[0]) as GeneratedGrammarQuestion;

  // Validate required fields
  if (!question.questionStem || !question.choices || !question.explanation) {
    throw new Error("Generated grammar question missing required fields");
  }

  // Ensure correctAnswer is set (default to A)
  if (!question.correctAnswer) {
    question.correctAnswer = "A";
  }

  console.log(`    Question: "${question.sentenceWithUnderline.slice(0, 60)}..."`);
  console.log(`    Testing: ${question.grammarRule}`);

  return question;
}

// ─────────────────────────────────────────────────────────
// CORE GENERATION LOGIC
// ─────────────────────────────────────────────────────────

interface GenerationResult {
  success: boolean;
  questionId?: Id<"questions">;
  error?: string;
  sampledParams: SampledGrammarParams;
}

/**
 * Core logic for generating a single grammar question.
 */
async function generateSingleGrammarQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  anthropic: Anthropic,
  params: SampledGrammarParams,
  batchId?: string
): Promise<GenerationResult> {
  try {
    // 1. GENERATE question with Claude
    console.log("  Stage 1: Generating grammar question with Claude...");
    let question: GeneratedGrammarQuestion;
    try {
      question = await generateGrammarQuestionWithClaude(anthropic, params);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMsg,
        sampledParams: params,
      };
    }

    // 2. STORE in database
    console.log("  Stage 2: Storing question...");
    try {
      // Map question type to domain and skill
      const domain = "standard_english_conventions";
      const skill = params.questionType;

      // For grammar questions, difficulty is primarily based on complexity and clarity
      const rwDifficulty = {
        passageComplexity: params.sentenceComplexity,
        inferenceDepth: 0.0, // Grammar questions don't require inference
        vocabularyLevel: params.sentenceComplexity,
        evidenceEvaluation: 0.0, // No evidence evaluation
        synthesisRequired: 0.0, // No synthesis required
      };

      // Create the question (no passage for grammar questions)
      const questionId = (await ctx.runMutation(
        internal.agentQuestions.createAgentQuestionInternal,
        {
          type: "multiple_choice" as const,
          category: "reading_writing" as const,
          domain,
          skill,
          prompt: question.questionStem,
          // No passageId for grammar questions - they're standalone sentences
          correctAnswer: question.correctAnswer,
          options: [
            { key: "A", content: question.choices.A, order: 0 },
            { key: "B", content: question.choices.B, order: 1 },
            { key: "C", content: question.choices.C, order: 2 },
            { key: "D", content: question.choices.D, order: 3 },
          ],
          explanation: question.explanation,
          rwDifficulty,
          generationMetadata: {
            generatedAt: Date.now(),
            agentVersion: "grammar-question-v1",
            promptTemplate: `grammar_${params.questionType}`,
            promptParameters: params,
            verbalizedSampling: {
              targetDifficultyDistribution: [
                { factor: "sentenceComplexity", mean: 0.5, stdDev: 0.2 },
                { factor: "contextClarity", mean: 0.5, stdDev: 0.2 },
              ],
              sampledValues: {
                ...params,
                sentenceWithUnderline: question.sentenceWithUnderline,
                grammarRule: question.grammarRule,
              },
            },
          },
          generationBatchId: batchId,
          tags: [
            "reading_writing",
            domain,
            skill,
            params.questionType,
            "grammar",
            "agent_generated",
          ],
        }
      )) as Id<"questions">;

      console.log(`  ✓ Success: Question ${questionId}`);

      return {
        success: true,
        questionId,
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
 * Generate a single grammar question.
 */
export const generateGrammarQuestion = internalAction({
  args: {
    questionType: v.union(
      v.literal("boundaries_between_sentences"),
      v.literal("boundaries_within_sentences"),
      v.literal("subject_verb_agreement"),
      v.literal("pronoun_antecedent_agreement"),
      v.literal("verb_finiteness"),
      v.literal("verb_tense_aspect"),
      v.literal("subject_modifier_placement"),
      v.literal("genitives_plurals")
    ),
    patternType: v.optional(v.string()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`\nGenerating ${args.questionType} question...`);

    const anthropic = getAnthropicClient();

    // Sample verbalized parameters with any overrides
    const params = sampleGrammarParams(
      args.questionType as SampledGrammarParams["questionType"],
      {
        patternType: args.patternType,
      }
    );

    console.log(`  Sampled params:`, {
      questionType: params.questionType,
      patternType: params.patternType,
      sentenceComplexity: params.sentenceComplexity.toFixed(2),
      contextClarity: params.contextClarity.toFixed(2),
    });

    return await generateSingleGrammarQuestion(ctx, anthropic, params, args.batchId);
  },
});

/**
 * Generate multiple grammar questions in batch.
 */
export const batchGenerateGrammarQuestions = internalAction({
  args: {
    count: v.number(),
    questionTypes: v.optional(
      v.array(
        v.union(
          v.literal("boundaries_between_sentences"),
          v.literal("boundaries_within_sentences"),
          v.literal("subject_verb_agreement"),
          v.literal("pronoun_antecedent_agreement"),
          v.literal("verb_finiteness"),
          v.literal("verb_tense_aspect"),
          v.literal("subject_modifier_placement"),
          v.literal("genitives_plurals")
        )
      )
    ),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchId = args.batchId ?? `grammar-${Date.now()}`;

    console.log(
      `\nStarting batch generation of ${args.count} grammar questions...`
    );
    console.log(`  Batch ID: ${batchId}`);
    if (args.questionTypes) {
      console.log(`  Question types: ${args.questionTypes.join(", ")}`);
    }

    const anthropic = getAnthropicClient();

    const results: Array<{
      index: number;
      success: boolean;
      questionId?: string;
      questionType?: string;
      error?: string;
    }> = [];

    // Default to all grammar types if none specified
    const questionTypes = args.questionTypes ?? [
      "boundaries_between_sentences",
      "boundaries_within_sentences",
      "subject_verb_agreement",
      "pronoun_antecedent_agreement",
      "verb_finiteness",
      "verb_tense_aspect",
      "subject_modifier_placement",
      "genitives_plurals",
    ];

    for (let i = 0; i < args.count; i++) {
      // Rotate through specified types
      const questionType = questionTypes[i % questionTypes.length] as SampledGrammarParams["questionType"];

      // Sample fresh parameters for each question
      const params = sampleGrammarParams(questionType);

      console.log(`\n[${i + 1}/${args.count}] Generating ${params.questionType}...`);
      console.log(`  Pattern: ${params.patternType}`);
      console.log(`  Difficulty: ${params.targetOverallDifficulty.toFixed(2)}`);

      const result = await generateSingleGrammarQuestion(ctx, anthropic, params, batchId);

      if (result.success) {
        results.push({
          index: i,
          success: true,
          questionId: result.questionId?.toString(),
          questionType: params.questionType,
        });
      } else {
        results.push({
          index: i,
          success: false,
          questionType: params.questionType,
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
