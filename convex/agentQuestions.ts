import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { computeOverallDifficulty, difficultyToLegacy } from "./questionsByDifficulty";

// ─────────────────────────────────────────────────────────
// DIFFICULTY FACTOR VALIDATORS
// ─────────────────────────────────────────────────────────

const mathDifficultyValidator = v.object({
  reasoningSteps: v.number(),
  algebraicComplexity: v.number(),
  conceptualDepth: v.number(),
  computationLoad: v.number(),
  multiStepRequired: v.number(),
});

const rwDifficultyValidator = v.object({
  passageComplexity: v.number(),
  inferenceDepth: v.number(),
  vocabularyLevel: v.number(),
  evidenceEvaluation: v.number(),
  synthesisRequired: v.number(),
});

const generationMetadataValidator = v.object({
  generatedAt: v.number(),
  agentVersion: v.string(),
  promptTemplate: v.string(),
  promptParameters: v.optional(v.any()),
  verbalizedSampling: v.optional(
    v.object({
      targetDifficultyDistribution: v.array(
        v.object({
          factor: v.string(),
          mean: v.number(),
          stdDev: v.number(),
        })
      ),
      sampledValues: v.any(),
    })
  ),
  qualityScore: v.optional(v.number()),
  humanReviewed: v.optional(v.boolean()),
  reviewedAt: v.optional(v.number()),
});

// ─────────────────────────────────────────────────────────
// CREATE AGENT-GENERATED QUESTION
// ─────────────────────────────────────────────────────────

/**
 * Create a new question with full difficulty factors.
 * Used by AI agents to insert generated questions.
 */
export const createAgentQuestion = mutation({
  args: {
    type: v.union(v.literal("multiple_choice"), v.literal("grid_in")),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    domain: v.string(),
    skill: v.string(),
    prompt: v.string(),
    correctAnswer: v.string(),
    options: v.array(
      v.object({
        key: v.string(),
        content: v.string(),
        order: v.number(),
      })
    ),
    explanation: v.string(),
    wrongAnswerExplanations: v.optional(
      v.object({
        A: v.optional(v.string()),
        B: v.optional(v.string()),
        C: v.optional(v.string()),
        D: v.optional(v.string()),
      })
    ),

    // Difficulty factors (one must be provided based on category)
    mathDifficulty: v.optional(mathDifficultyValidator),
    rwDifficulty: v.optional(rwDifficultyValidator),

    // Generation metadata
    generationMetadata: generationMetadataValidator,

    // Optional fields
    passageId: v.optional(v.id("passages")),
    tags: v.optional(v.array(v.string())),
    generationBatchId: v.optional(v.string()),

    // Figure for questions with images (graphs, charts, tables)
    figure: v.optional(
      v.object({
        imageId: v.id("images"),
        figureType: v.optional(
          v.union(
            v.literal("graph"),
            v.literal("geometric"),
            v.literal("data_display"),
            v.literal("diagram"),
            v.literal("table")
          )
        ),
        caption: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Compute overall difficulty from factors
    let overallDifficulty = 0.5;
    if (args.category === "math" && args.mathDifficulty) {
      overallDifficulty = computeOverallDifficulty("math", args.mathDifficulty);
    } else if (args.category === "reading_writing" && args.rwDifficulty) {
      overallDifficulty = computeOverallDifficulty(
        "reading_writing",
        args.rwDifficulty
      );
    }

    // Compute legacy difficulty (1-3)
    const legacyDifficulty = difficultyToLegacy(overallDifficulty);

    // Create question
    const questionId = await ctx.db.insert("questions", {
      type: args.type,
      category: args.category,
      domain: args.domain,
      skill: args.skill,
      difficulty: legacyDifficulty,
      overallDifficulty,
      mathDifficulty: args.mathDifficulty,
      rwDifficulty: args.rwDifficulty,
      prompt: args.prompt,
      passageId: args.passageId,
      figure: args.figure,
      correctAnswer: args.correctAnswer,
      source: {
        type: "agent_generated",
        generationBatchId: args.generationBatchId,
      },
      generationMetadata: args.generationMetadata,
      tags: args.tags ?? [args.domain, args.skill, "agent_generated"],
      // New: Set initial review status so questions must be verified before showing to students
      reviewStatus: "pending",
    });

    // Create answer options
    for (const option of args.options) {
      await ctx.db.insert("answerOptions", {
        questionId,
        key: option.key,
        content: option.content,
        order: option.order,
      });
    }

    // Create explanation
    await ctx.db.insert("explanations", {
      questionId,
      correctExplanation: args.explanation,
      wrongAnswerExplanations: args.wrongAnswerExplanations,
    });

    return { questionId, overallDifficulty, legacyDifficulty };
  },
});

/**
 * Internal mutation for creating agent questions from actions.
 * Used by readingDataGeneration.ts and other action-based pipelines.
 */
export const createAgentQuestionInternal = internalMutation({
  args: {
    type: v.union(v.literal("multiple_choice"), v.literal("grid_in")),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    domain: v.string(),
    skill: v.string(),
    prompt: v.string(),
    correctAnswer: v.string(),
    options: v.array(
      v.object({
        key: v.string(),
        content: v.string(),
        order: v.number(),
      })
    ),
    explanation: v.string(),
    wrongAnswerExplanations: v.optional(
      v.object({
        A: v.optional(v.string()),
        B: v.optional(v.string()),
        C: v.optional(v.string()),
        D: v.optional(v.string()),
      })
    ),
    mathDifficulty: v.optional(mathDifficultyValidator),
    rwDifficulty: v.optional(rwDifficultyValidator),
    passageId: v.optional(v.id("passages")),
    figure: v.optional(
      v.object({
        imageId: v.id("images"),
        figureType: v.optional(
          v.union(
            v.literal("graph"),
            v.literal("geometric"),
            v.literal("data_display"),
            v.literal("diagram"),
            v.literal("table")
          )
        ),
        caption: v.optional(v.string()),
      })
    ),
    generationMetadata: generationMetadataValidator,
    generationBatchId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<Id<"questions">> => {
    // Compute overall difficulty from factors
    let overallDifficulty = 0.5;
    if (args.category === "math" && args.mathDifficulty) {
      overallDifficulty = computeOverallDifficulty("math", args.mathDifficulty);
    } else if (args.category === "reading_writing" && args.rwDifficulty) {
      overallDifficulty = computeOverallDifficulty(
        "reading_writing",
        args.rwDifficulty
      );
    }

    // Compute legacy difficulty (1-3)
    const legacyDifficulty = difficultyToLegacy(overallDifficulty);

    // Create question
    const questionId = await ctx.db.insert("questions", {
      type: args.type,
      category: args.category,
      domain: args.domain,
      skill: args.skill,
      difficulty: legacyDifficulty,
      overallDifficulty,
      mathDifficulty: args.mathDifficulty,
      rwDifficulty: args.rwDifficulty,
      prompt: args.prompt,
      passageId: args.passageId,
      figure: args.figure,
      correctAnswer: args.correctAnswer,
      source: {
        type: "agent_generated",
        generationBatchId: args.generationBatchId,
      },
      generationMetadata: args.generationMetadata,
      tags: args.tags ?? [args.domain, args.skill, "agent_generated"],
      // New: Set initial review status so questions must be verified before showing to students
      reviewStatus: "pending",
    });

    // Create answer options
    for (const option of args.options) {
      await ctx.db.insert("answerOptions", {
        questionId,
        key: option.key,
        content: option.content,
        order: option.order,
      });
    }

    // Create explanation
    await ctx.db.insert("explanations", {
      questionId,
      correctExplanation: args.explanation,
      wrongAnswerExplanations: args.wrongAnswerExplanations,
    });

    return questionId;
  },
});

// ─────────────────────────────────────────────────────────
// BATCH QUESTION CREATION
// ─────────────────────────────────────────────────────────

/**
 * Register a new question generation batch.
 * The agent should call this before starting to generate questions.
 */
export const createQuestionBatch = mutation({
  args: {
    batchId: v.string(),
    agentVersion: v.string(),
    targetCategory: v.union(v.literal("reading_writing"), v.literal("math")),
    targetDomain: v.optional(v.string()),
    targetSkill: v.optional(v.string()),
    targetCount: v.number(),
    difficultyTargets: v.object({
      overallDifficultyRange: v.object({
        min: v.number(),
        max: v.number(),
      }),
      factorTargets: v.optional(
        v.array(
          v.object({
            factor: v.string(),
            targetMean: v.number(),
            targetStdDev: v.number(),
          })
        )
      ),
    }),
  },
  handler: async (ctx, args) => {
    const batchDocId = await ctx.db.insert("questionGenerationBatches", {
      batchId: args.batchId,
      createdAt: Date.now(),
      status: "pending",
      agentVersion: args.agentVersion,
      targetCategory: args.targetCategory,
      targetDomain: args.targetDomain,
      targetSkill: args.targetSkill,
      targetCount: args.targetCount,
      difficultyTargets: args.difficultyTargets,
      questionsGenerated: 0,
      questionIds: [],
    });

    return { batchDocId, batchId: args.batchId };
  },
});

/**
 * Update batch status as questions are generated.
 */
export const updateBatchProgress = mutation({
  args: {
    batchId: v.string(),
    questionId: v.id("questions"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("questionGenerationBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) {
      throw new Error(`Batch not found: ${args.batchId}`);
    }

    const updates: Record<string, unknown> = {
      questionsGenerated: batch.questionsGenerated + 1,
      questionIds: [...batch.questionIds, args.questionId],
    };

    if (args.status) {
      updates.status = args.status;
      if (args.status === "completed" || args.status === "failed") {
        updates.completedAt = Date.now();
      }
    }

    if (args.errorMessage) {
      updates.errorLog = [...(batch.errorLog ?? []), args.errorMessage];
    }

    await ctx.db.patch(batch._id, updates);

    return {
      questionsGenerated: batch.questionsGenerated + 1,
      targetCount: batch.targetCount,
      isComplete: batch.questionsGenerated + 1 >= batch.targetCount,
    };
  },
});

/**
 * Get batch status and progress.
 */
export const getBatchStatus = query({
  args: {
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("questionGenerationBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) return null;

    return {
      ...batch,
      progress: batch.questionsGenerated / batch.targetCount,
      isComplete: batch.questionsGenerated >= batch.targetCount,
    };
  },
});

// ─────────────────────────────────────────────────────────
// DIFFICULTY CALIBRATION
// ─────────────────────────────────────────────────────────

/**
 * Update difficulty calibration based on user answer.
 * Called internally after each answer to learn actual difficulty.
 */
export const updateDifficultyCalibration = internalMutation({
  args: {
    questionId: v.id("questions"),
    isCorrect: v.boolean(),
    userMasteryLevel: v.number(), // 0-1000
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return;

    // Get or create calibration record
    let calibration = await ctx.db
      .query("difficultyCalibration")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();

    // Calculate difficulty adjustment:
    // - If user got it wrong, observed difficulty increases
    // - If user got it right, observed difficulty decreases
    // - Weight by user's mastery level (harder if low-mastery user got it wrong)
    const masteryWeight = args.userMasteryLevel / 1000;
    const difficultyDelta = args.isCorrect
      ? -0.02 * (1 - masteryWeight) // Easier if high-mastery user got it right
      : 0.03 * masteryWeight; // Harder if low-mastery user got it wrong

    if (calibration) {
      const newObserved = Math.max(
        0,
        Math.min(1, calibration.observedDifficulty + difficultyDelta)
      );

      // Calculate confidence interval based on sample size
      const sampleSize = calibration.sampleSize + 1;
      const stdError = 0.5 / Math.sqrt(sampleSize); // Rough approximation

      await ctx.db.patch(calibration._id, {
        observedDifficulty: newObserved,
        sampleSize: sampleSize,
        lastUpdatedAt: Date.now(),
        confidenceInterval: {
          lower: Math.max(0, newObserved - 1.96 * stdError),
          upper: Math.min(1, newObserved + 1.96 * stdError),
        },
      });
    } else {
      const predicted = question.overallDifficulty ?? 0.5;
      await ctx.db.insert("difficultyCalibration", {
        questionId: args.questionId,
        category: question.category,
        predictedDifficulty: predicted,
        observedDifficulty: Math.max(
          0,
          Math.min(1, predicted + difficultyDelta)
        ),
        sampleSize: 1,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get calibration data for a question.
 */
export const getQuestionCalibration = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("difficultyCalibration")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();
  },
});

/**
 * Get questions that need more calibration data.
 * Useful for prioritizing questions to show to users.
 */
export const getUndercalibratedQuestions = query({
  args: {
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    minSampleSize: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minSamples = args.minSampleSize ?? 30; // Statistical significance threshold
    const limit = args.limit ?? 50;

    // Get all questions in category
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Get calibration data
    const calibrations = await ctx.db
      .query("difficultyCalibration")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    const calibrationMap = new Map(
      calibrations.map((c) => [c.questionId.toString(), c])
    );

    // Find questions with insufficient calibration
    const undercalibrated = questions
      .map((q) => {
        const cal = calibrationMap.get(q._id.toString());
        return {
          question: q,
          sampleSize: cal?.sampleSize ?? 0,
          needsSamples: minSamples - (cal?.sampleSize ?? 0),
        };
      })
      .filter((item) => item.needsSamples > 0)
      .sort((a, b) => b.needsSamples - a.needsSamples)
      .slice(0, limit);

    return undercalibrated;
  },
});

// ─────────────────────────────────────────────────────────
// PASSAGE CREATION FOR READING/WRITING QUESTIONS
// ─────────────────────────────────────────────────────────

/**
 * Create a passage for reading/writing questions.
 */
export const createPassage = mutation({
  args: {
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    source: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const passageId = await ctx.db.insert("passages", {
      title: args.title,
      author: args.author,
      source: args.source,
      content: args.content,
    });

    return { passageId };
  },
});

// ─────────────────────────────────────────────────────────
// BULK OPERATIONS
// ─────────────────────────────────────────────────────────

/**
 * Get all questions from a generation batch.
 */
export const getBatchQuestions = query({
  args: {
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("questionGenerationBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) return null;

    const questions = await Promise.all(
      batch.questionIds.map((id) => ctx.db.get(id))
    );

    return {
      batch,
      questions: questions.filter((q): q is NonNullable<typeof q> => q !== null),
    };
  },
});

/**
 * Delete all questions from a batch (for cleanup/rollback).
 */
export const deleteBatchQuestions = mutation({
  args: {
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("questionGenerationBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) {
      throw new Error(`Batch not found: ${args.batchId}`);
    }

    let deleted = 0;
    for (const questionId of batch.questionIds) {
      // Delete answer options
      const options = await ctx.db
        .query("answerOptions")
        .withIndex("by_question", (q) => q.eq("questionId", questionId))
        .collect();
      for (const option of options) {
        await ctx.db.delete(option._id);
      }

      // Delete explanations
      const explanations = await ctx.db
        .query("explanations")
        .withIndex("by_question", (q) => q.eq("questionId", questionId))
        .collect();
      for (const exp of explanations) {
        await ctx.db.delete(exp._id);
      }

      // Delete calibration data
      const calibration = await ctx.db
        .query("difficultyCalibration")
        .withIndex("by_question", (q) => q.eq("questionId", questionId))
        .first();
      if (calibration) {
        await ctx.db.delete(calibration._id);
      }

      // Delete question
      await ctx.db.delete(questionId);
      deleted++;
    }

    // Delete batch record
    await ctx.db.delete(batch._id);

    return { deleted, batchId: args.batchId };
  },
});
