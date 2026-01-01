import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────
// IMAGE GENERATION DEAD LETTER QUEUE
// ─────────────────────────────────────────────────────────
// Stores failed image generation attempts for retry.

const MAX_RETRIES = 3;

/**
 * Add a failed image generation to the DLQ.
 */
export const addToDLQ = internalMutation({
  args: {
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
    imageAltText: v.optional(v.string()),
    claudePrompt: v.optional(v.string()),
    error: v.string(),
    errorStage: v.union(
      v.literal("claude"),
      v.literal("gemini"),
      v.literal("upload")
    ),
  },
  handler: async (ctx, args) => {
    const dlqId = await ctx.db.insert("imageGenerationDLQ", {
      questionPrompt: args.questionPrompt,
      options: args.options,
      correctAnswer: args.correctAnswer,
      figureType: args.figureType,
      domain: args.domain,
      skill: args.skill,
      imageAltText: args.imageAltText,
      claudePrompt: args.claudePrompt,
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
 * Get a single DLQ item by ID (for retry action).
 */
export const getItemById = query({
  args: {
    dlqId: v.id("imageGenerationDLQ"),
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
      .query("imageGenerationDLQ")
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
    const all = await ctx.db.query("imageGenerationDLQ").collect();

    const stats = {
      total: all.length,
      pending: all.filter((item) => item.status === "pending").length,
      retrying: all.filter((item) => item.status === "retrying").length,
      succeeded: all.filter((item) => item.status === "succeeded").length,
      failedPermanently: all.filter((item) => item.status === "failed_permanently").length,
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
      .query("imageGenerationDLQ")
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
    dlqId: v.id("imageGenerationDLQ"),
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
    dlqId: v.id("imageGenerationDLQ"),
    imageId: v.id("images"),
    questionId: v.optional(v.id("questions")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dlqId, {
      status: "succeeded",
      imageId: args.imageId,
      questionId: args.questionId,
    });
  },
});

/**
 * Mark a DLQ item as failed (increment retry or mark permanent failure).
 */
export const markFailed = internalMutation({
  args: {
    dlqId: v.id("imageGenerationDLQ"),
    error: v.string(),
    errorStage: v.union(
      v.literal("claude"),
      v.literal("gemini"),
      v.literal("upload")
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
      lastAttemptAt: Date.now(),
    });

    return { isPermanentFailure };
  },
});

/**
 * Retry all pending DLQ items.
 * Schedules the retry pipeline action.
 */
export const retryPendingItems = mutation({
  args: {},
  handler: async (ctx) => {
    const pendingItems = await ctx.db
      .query("imageGenerationDLQ")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    if (pendingItems.length === 0) {
      return { message: "No pending items to retry", count: 0 };
    }

    // Schedule the retry action
    await ctx.scheduler.runAfter(
      0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (internal as any).graphImagePipeline.retryDLQItems,
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
      .query("imageGenerationDLQ")
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
    const allItems = await ctx.db.query("imageGenerationDLQ").collect();

    for (const item of allItems) {
      await ctx.db.delete(item._id);
    }

    return { deleted: allItems.length };
  },
});
