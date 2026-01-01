import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new exam attempt
export const createAttempt = mutation({
  args: {
    visitorId: v.string(),
    mode: v.union(v.literal("sat"), v.literal("practice"), v.literal("endless")),
    section: v.optional(v.union(v.literal("reading_writing"), v.literal("math"))),
    examId: v.optional(v.id("exams")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const attemptId = await ctx.db.insert("examAttempts", {
      visitorId: args.visitorId,
      examId: args.examId,
      mode: args.mode,
      section: args.section,
      currentSectionIndex: 0,
      currentQuestionIndex: 0,
      status: "in_progress",
      startedAt: now,
      lastActiveAt: now,
    });

    return attemptId;
  },
});

// Get current attempt for a visitor (with answer stats for resume display)
export const getCurrentAttempt = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("examAttempts")
      .withIndex("by_visitor_and_status", (q) =>
        q.eq("visitorId", args.visitorId).eq("status", "in_progress")
      )
      .first();

    if (!attempt) return null;

    // Get answer count for this attempt
    const answers = await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
      .collect();

    const answeredCount = answers.filter((a) => a.selectedAnswer).length;

    return {
      ...attempt,
      answeredCount,
    };
  },
});

// Get attempt by ID
export const getAttempt = query({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.attemptId);
  },
});

// Update attempt progress
export const updateProgress = mutation({
  args: {
    attemptId: v.id("examAttempts"),
    currentSectionIndex: v.optional(v.number()),
    currentQuestionIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, number> = {
      lastActiveAt: Date.now(),
    };

    if (args.currentSectionIndex !== undefined) {
      updates.currentSectionIndex = args.currentSectionIndex;
    }
    if (args.currentQuestionIndex !== undefined) {
      updates.currentQuestionIndex = args.currentQuestionIndex;
    }

    await ctx.db.patch(args.attemptId, updates);
  },
});

// Complete an attempt
export const completeAttempt = mutation({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.attemptId, {
      status: "completed",
      completedAt: now,
      lastActiveAt: now,
    });
  },
});

// Pause an attempt
export const pauseAttempt = mutation({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.attemptId, {
      status: "paused",
      lastActiveAt: Date.now(),
    });
  },
});

// Resume an attempt
export const resumeAttempt = mutation({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.attemptId, {
      status: "in_progress",
      lastActiveAt: Date.now(),
    });
  },
});

// Abandon an attempt
export const abandonAttempt = mutation({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.attemptId, {
      status: "abandoned",
      lastActiveAt: Date.now(),
    });
  },
});

// Get all attempts for a visitor
export const getAttemptHistory = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examAttempts")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();
  },
});

// Get recent attempts with calculated stats (for dashboard)
export const getRecentAttempts = query({
  args: {
    visitorId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.visitorId) return [];

    const limit = args.limit ?? 5;

    const attempts = await ctx.db
      .query("examAttempts")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .order("desc")
      .take(limit);

    // Enrich with answer stats
    const enrichedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        const answers = await ctx.db
          .query("userAnswers")
          .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
          .collect();

        const correctAnswers = answers.filter((a) => a.isCorrect).length;
        const totalQuestions = answers.length;

        // Get score report if exists
        const scoreReport = await ctx.db
          .query("scoreReports")
          .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
          .first();

        return {
          ...attempt,
          correctAnswers,
          totalQuestions,
          scaledScore: scoreReport?.totalScaled,
        };
      })
    );

    return enrichedAttempts;
  },
});

// Get all attempts with stats (for history page)
export const getAllAttempts = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    if (!args.visitorId) return [];

    const attempts = await ctx.db
      .query("examAttempts")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .order("desc")
      .collect();

    // Enrich with answer stats and scores
    const enrichedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        const answers = await ctx.db
          .query("userAnswers")
          .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
          .collect();

        const correctAnswers = answers.filter((a) => a.isCorrect).length;
        const totalQuestions = answers.length;

        // Get score report if exists
        const scoreReport = await ctx.db
          .query("scoreReports")
          .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
          .first();

        return {
          ...attempt,
          correctAnswers,
          totalQuestions,
          scaledScore: scoreReport?.totalScaled,
          rwScaled: scoreReport?.readingWritingScaled,
          mathScaled: scoreReport?.mathScaled,
        };
      })
    );

    return enrichedAttempts;
  },
});
