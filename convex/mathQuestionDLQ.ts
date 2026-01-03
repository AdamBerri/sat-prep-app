import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────
// MATH QUESTION DEAD LETTER QUEUE
// ─────────────────────────────────────────────────────────
// Stores failed math question generation attempts for retry.

const MAX_RETRIES = 3;

/**
 * Add a failed math question generation to the DLQ.
 */
export const addToDLQ = internalMutation({
  args: {
    domain: v.union(
      v.literal("algebra"),
      v.literal("advanced_math"),
      v.literal("problem_solving"),
      v.literal("geometry_trig")
    ),
    skill: v.string(),
    sampledParams: v.object({
      domain: v.string(),
      skill: v.string(),
      contextType: v.string(),
      figureType: v.string(),
      reasoningSteps: v.number(),
      algebraicComplexity: v.number(),
      conceptualDepth: v.number(),
      computationLoad: v.number(),
      multiStepRequired: v.number(),
      wordProblemComplexity: v.number(),
      distractorStrategies: v.array(v.string()),
      targetOverallDifficulty: v.number(),
    }),
    problemData: v.optional(
      v.object({
        problemText: v.string(),
        correctAnswer: v.string(),
        solutionSteps: v.array(v.string()),
      })
    ),
    batchId: v.optional(v.string()),
    error: v.string(),
    errorStage: v.union(
      v.literal("problem_generation"),
      v.literal("figure_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
  },
  handler: async (ctx, args) => {
    const dlqId = await ctx.db.insert("mathQuestionDLQ", {
      domain: args.domain,
      skill: args.skill,
      sampledParams: args.sampledParams,
      problemData: args.problemData,
      batchId: args.batchId,
      error: args.error,
      errorStage: args.errorStage,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      lastAttemptAt: Date.now(),
      status: "pending",
      createdAt: Date.now(),
    });

    return dlqId;
  },
});

/**
 * Get a single DLQ item by ID (internal use).
 */
export const getItemById = internalQuery({
  args: {
    dlqId: v.id("mathQuestionDLQ"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.dlqId);
  },
});

/**
 * Get all pending DLQ items.
 */
export const getPendingItems = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("mathQuestionDLQ")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

/**
 * Get DLQ stats.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("mathQuestionDLQ").collect();

    const stats = {
      total: all.length,
      pending: all.filter((item) => item.status === "pending").length,
      retrying: all.filter((item) => item.status === "retrying").length,
      succeeded: all.filter((item) => item.status === "succeeded").length,
      failedPermanently: all.filter((item) => item.status === "failed_permanently").length,
      byDomain: {
        algebra: all.filter((item) => item.domain === "algebra").length,
        advanced_math: all.filter((item) => item.domain === "advanced_math").length,
        problem_solving: all.filter((item) => item.domain === "problem_solving").length,
        geometry_trig: all.filter((item) => item.domain === "geometry_trig").length,
      },
      byErrorStage: {
        problem_generation: all.filter((item) => item.errorStage === "problem_generation").length,
        figure_generation: all.filter((item) => item.errorStage === "figure_generation").length,
        question_generation: all.filter((item) => item.errorStage === "question_generation").length,
        storage: all.filter((item) => item.errorStage === "storage").length,
      },
    };

    return stats;
  },
});

/**
 * Get recent DLQ items with details.
 */
export const getRecentItems = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("mathQuestionDLQ")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});

/**
 * Mark a DLQ item as retrying.
 */
export const markRetrying = internalMutation({
  args: {
    dlqId: v.id("mathQuestionDLQ"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.dlqId);
    if (!item) throw new Error("DLQ item not found");

    await ctx.db.patch(args.dlqId, {
      status: "retrying",
      retryCount: item.retryCount + 1,
      lastAttemptAt: Date.now(),
    });
  },
});

/**
 * Mark a DLQ item as succeeded.
 */
export const markSucceeded = internalMutation({
  args: {
    dlqId: v.id("mathQuestionDLQ"),
    questionId: v.id("questions"),
    imageId: v.optional(v.id("images")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dlqId, {
      status: "succeeded",
      questionId: args.questionId,
      imageId: args.imageId,
    });
  },
});

/**
 * Mark a DLQ item as failed (increment retry or mark permanent failure).
 */
export const markFailed = internalMutation({
  args: {
    dlqId: v.id("mathQuestionDLQ"),
    error: v.string(),
    errorStage: v.union(
      v.literal("problem_generation"),
      v.literal("figure_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
    problemData: v.optional(
      v.object({
        problemText: v.string(),
        correctAnswer: v.string(),
        solutionSteps: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.dlqId);
    if (!item) throw new Error("DLQ item not found");

    const newRetryCount = item.retryCount + 1;
    const isPermanentFailure = newRetryCount >= item.maxRetries;

    await ctx.db.patch(args.dlqId, {
      status: isPermanentFailure ? "failed_permanently" : "pending",
      retryCount: newRetryCount,
      error: args.error,
      errorStage: args.errorStage,
      problemData: args.problemData ?? item.problemData,
      lastAttemptAt: Date.now(),
    });

    return { isPermanentFailure };
  },
});

/**
 * Retry all pending DLQ items.
 */
export const retryPendingItems = mutation({
  args: {},
  handler: async (ctx) => {
    const pendingItems = await ctx.db
      .query("mathQuestionDLQ")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    if (pendingItems.length === 0) {
      return { message: "No pending items to retry", count: 0 };
    }

    // Schedule the retry action
    await ctx.scheduler.runAfter(
      0,
      internal.mathQuestionGeneration.retryDLQItems,
      { dlqIds: pendingItems.map((item) => item._id) }
    );

    return {
      message: `Scheduled retry for ${pendingItems.length} items`,
      count: pendingItems.length,
    };
  },
});

/**
 * Clear succeeded items from DLQ.
 */
export const clearSucceeded = mutation({
  args: {},
  handler: async (ctx) => {
    const succeededItems = await ctx.db
      .query("mathQuestionDLQ")
      .withIndex("by_status", (q) => q.eq("status", "succeeded"))
      .collect();

    for (const item of succeededItems) {
      await ctx.db.delete(item._id);
    }

    return { deleted: succeededItems.length };
  },
});

/**
 * Clear all DLQ items (use with caution).
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const allItems = await ctx.db.query("mathQuestionDLQ").collect();

    for (const item of allItems) {
      await ctx.db.delete(item._id);
    }

    return { deleted: allItems.length };
  },
});
