import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────
// READING DATA QUESTION DEAD LETTER QUEUE
// ─────────────────────────────────────────────────────────
// Stores failed reading data question generation attempts for retry.

const MAX_RETRIES = 3;

/**
 * Add a failed reading data question generation to the DLQ.
 */
export const addToDLQ = internalMutation({
  args: {
    dataType: v.union(
      v.literal("bar_chart"),
      v.literal("line_graph"),
      v.literal("data_table")
    ),
    sampledParams: v.object({
      claimType: v.string(),
      claimStrength: v.number(),
      targetDataPoint: v.string(),
      questionPosition: v.string(),
      distractorStrategies: v.array(v.string()),
      domain: v.string(),
    }),
    chartData: v.optional(v.any()),
    batchId: v.optional(v.string()),
    error: v.string(),
    errorStage: v.union(
      v.literal("data_generation"),
      v.literal("image_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
  },
  handler: async (ctx, args) => {
    const dlqId = await ctx.db.insert("readingDataDLQ", {
      dataType: args.dataType,
      sampledParams: args.sampledParams,
      chartData: args.chartData,
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
 * Get a single DLQ item by ID.
 */
export const getItemById = internalQuery({
  args: {
    dlqId: v.id("readingDataDLQ"),
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
      .query("readingDataDLQ")
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
    const all = await ctx.db.query("readingDataDLQ").collect();

    const stats = {
      total: all.length,
      pending: all.filter((item) => item.status === "pending").length,
      retrying: all.filter((item) => item.status === "retrying").length,
      succeeded: all.filter((item) => item.status === "succeeded").length,
      failedPermanently: all.filter((item) => item.status === "failed_permanently").length,
      byDataType: {
        bar_chart: all.filter((item) => item.dataType === "bar_chart").length,
        line_graph: all.filter((item) => item.dataType === "line_graph").length,
        data_table: all.filter((item) => item.dataType === "data_table").length,
      },
      byErrorStage: {
        data_generation: all.filter((item) => item.errorStage === "data_generation").length,
        image_generation: all.filter((item) => item.errorStage === "image_generation").length,
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
      .query("readingDataDLQ")
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
    dlqId: v.id("readingDataDLQ"),
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
    dlqId: v.id("readingDataDLQ"),
    imageId: v.id("images"),
    questionId: v.id("questions"),
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
    dlqId: v.id("readingDataDLQ"),
    error: v.string(),
    errorStage: v.union(
      v.literal("data_generation"),
      v.literal("image_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
    chartData: v.optional(v.any()),
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
      chartData: args.chartData ?? item.chartData,
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
      .query("readingDataDLQ")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    if (pendingItems.length === 0) {
      return { message: "No pending items to retry", count: 0 };
    }

    // Schedule the retry action
    await ctx.scheduler.runAfter(
      0,
      internal.readingDataGeneration.retryDLQItems,
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
      .query("readingDataDLQ")
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
    const allItems = await ctx.db.query("readingDataDLQ").collect();

    for (const item of allItems) {
      await ctx.db.delete(item._id);
    }

    return { deleted: allItems.length };
  },
});
