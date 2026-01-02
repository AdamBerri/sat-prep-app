import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────
// READING QUESTION DEAD LETTER QUEUE
// ─────────────────────────────────────────────────────────
// Stores failed reading question generation attempts for retry.

const MAX_RETRIES = 3;

/**
 * Add a failed reading question generation to the DLQ.
 */
export const addToDLQ = internalMutation({
  args: {
    questionType: v.union(
      v.literal("central_ideas"),
      v.literal("inferences"),
      v.literal("vocabulary_in_context"),
      v.literal("text_structure"),
      v.literal("command_of_evidence"),
      v.literal("rhetorical_synthesis")
    ),
    passageType: v.union(
      v.literal("literary_narrative"),
      v.literal("social_science"),
      v.literal("natural_science"),
      v.literal("humanities")
    ),
    sampledParams: v.object({
      questionType: v.string(),
      questionFocus: v.string(),
      passageType: v.string(),
      passageLength: v.string(),
      passageComplexity: v.number(),
      inferenceDepth: v.number(),
      vocabularyLevel: v.number(),
      evidenceEvaluation: v.number(),
      synthesisRequired: v.number(),
      distractorStrategies: v.array(v.string()),
      targetOverallDifficulty: v.number(),
    }),
    passageData: v.optional(
      v.object({
        passage: v.string(),
        title: v.optional(v.union(v.string(), v.null())),
        author: v.string(),
        mainIdea: v.string(),
      })
    ),
    batchId: v.optional(v.string()),
    error: v.string(),
    errorStage: v.union(
      v.literal("passage_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
  },
  handler: async (ctx, args) => {
    const dlqId = await ctx.db.insert("readingQuestionDLQ", {
      questionType: args.questionType,
      passageType: args.passageType,
      sampledParams: args.sampledParams,
      passageData: args.passageData,
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
    dlqId: v.id("readingQuestionDLQ"),
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
      .query("readingQuestionDLQ")
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
    const all = await ctx.db.query("readingQuestionDLQ").collect();

    const stats = {
      total: all.length,
      pending: all.filter((item) => item.status === "pending").length,
      retrying: all.filter((item) => item.status === "retrying").length,
      succeeded: all.filter((item) => item.status === "succeeded").length,
      failedPermanently: all.filter((item) => item.status === "failed_permanently").length,
      byQuestionType: {
        central_ideas: all.filter((item) => item.questionType === "central_ideas").length,
        inferences: all.filter((item) => item.questionType === "inferences").length,
        vocabulary_in_context: all.filter((item) => item.questionType === "vocabulary_in_context").length,
        text_structure: all.filter((item) => item.questionType === "text_structure").length,
        command_of_evidence: all.filter((item) => item.questionType === "command_of_evidence").length,
        rhetorical_synthesis: all.filter((item) => item.questionType === "rhetorical_synthesis").length,
      },
      byPassageType: {
        literary_narrative: all.filter((item) => item.passageType === "literary_narrative").length,
        social_science: all.filter((item) => item.passageType === "social_science").length,
        natural_science: all.filter((item) => item.passageType === "natural_science").length,
        humanities: all.filter((item) => item.passageType === "humanities").length,
      },
      byErrorStage: {
        passage_generation: all.filter((item) => item.errorStage === "passage_generation").length,
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
      .query("readingQuestionDLQ")
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
    dlqId: v.id("readingQuestionDLQ"),
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
    dlqId: v.id("readingQuestionDLQ"),
    passageId: v.id("passages"),
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dlqId, {
      status: "succeeded",
      passageId: args.passageId,
      questionId: args.questionId,
    });
  },
});

/**
 * Mark a DLQ item as failed (increment retry or mark permanent failure).
 */
export const markFailed = internalMutation({
  args: {
    dlqId: v.id("readingQuestionDLQ"),
    error: v.string(),
    errorStage: v.union(
      v.literal("passage_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
    passageData: v.optional(
      v.object({
        passage: v.string(),
        title: v.optional(v.union(v.string(), v.null())),
        author: v.string(),
        mainIdea: v.string(),
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
      passageData: args.passageData ?? item.passageData,
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
      .query("readingQuestionDLQ")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    if (pendingItems.length === 0) {
      return { message: "No pending items to retry", count: 0 };
    }

    // Schedule the retry action
    await ctx.scheduler.runAfter(
      0,
      internal.readingQuestionGeneration.retryDLQItems,
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
      .query("readingQuestionDLQ")
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
    const allItems = await ctx.db.query("readingQuestionDLQ").collect();

    for (const item of allItems) {
      await ctx.db.delete(item._id);
    }

    return { deleted: allItems.length };
  },
});
