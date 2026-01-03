import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Save or update an answer
export const saveAnswer = mutation({
  args: {
    attemptId: v.id("examAttempts"),
    questionId: v.id("questions"),
    selectedAnswer: v.optional(v.string()),
    flagged: v.optional(v.boolean()),
    crossedOut: v.optional(v.array(v.string())),
    timeSpentMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the attempt to get visitorId
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");

    // Check if answer already exists
    const existing = await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt_and_question", (q) =>
        q.eq("attemptId", args.attemptId).eq("questionId", args.questionId)
      )
      .first();

    if (existing) {
      // Update existing answer
      const updates: Record<string, unknown> = {
        lastModifiedAt: now,
      };

      if (args.selectedAnswer !== undefined) {
        updates.selectedAnswer = args.selectedAnswer;
        updates.status = args.selectedAnswer ? "draft" : "empty";
      }
      if (args.flagged !== undefined) {
        updates.flagged = args.flagged;
      }
      if (args.crossedOut !== undefined) {
        updates.crossedOut = args.crossedOut;
      }
      if (args.timeSpentMs !== undefined) {
        updates.timeSpentMs = existing.timeSpentMs + args.timeSpentMs;
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new answer
      const answerId = await ctx.db.insert("userAnswers", {
        attemptId: args.attemptId,
        questionId: args.questionId,
        visitorId: attempt.visitorId,
        selectedAnswer: args.selectedAnswer,
        status: args.selectedAnswer ? "draft" : "empty",
        flagged: args.flagged ?? false,
        crossedOut: args.crossedOut ?? [],
        firstViewedAt: now,
        lastModifiedAt: now,
        timeSpentMs: args.timeSpentMs ?? 0,
      });
      return answerId;
    }
  },
});

// Toggle flag on an answer
export const toggleFlag = mutation({
  args: {
    attemptId: v.id("examAttempts"),
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    // Get the attempt to get visitorId
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");

    const existing = await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt_and_question", (q) =>
        q.eq("attemptId", args.attemptId).eq("questionId", args.questionId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        flagged: !existing.flagged,
        lastModifiedAt: now,
      });
    } else {
      await ctx.db.insert("userAnswers", {
        attemptId: args.attemptId,
        questionId: args.questionId,
        visitorId: attempt.visitorId,
        status: "empty",
        flagged: true,
        firstViewedAt: now,
        lastModifiedAt: now,
        timeSpentMs: 0,
      });
    }
  },
});

// Update crossed out options
export const updateCrossedOut = mutation({
  args: {
    attemptId: v.id("examAttempts"),
    questionId: v.id("questions"),
    crossedOut: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the attempt to get visitorId
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");

    const existing = await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt_and_question", (q) =>
        q.eq("attemptId", args.attemptId).eq("questionId", args.questionId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        crossedOut: args.crossedOut,
        lastModifiedAt: now,
      });
    } else {
      await ctx.db.insert("userAnswers", {
        attemptId: args.attemptId,
        questionId: args.questionId,
        visitorId: attempt.visitorId,
        status: "empty",
        flagged: false,
        crossedOut: args.crossedOut,
        firstViewedAt: now,
        lastModifiedAt: now,
        timeSpentMs: 0,
      });
    }
  },
});

// Submit all answers (grade them)
export const submitAnswers = mutation({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all answers for this attempt
    const answers = await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .collect();

    // Grade each answer
    for (const answer of answers) {
      const question = await ctx.db.get(answer.questionId);
      if (!question) continue;

      const isCorrect = answer.selectedAnswer === question.correctAnswer;

      await ctx.db.patch(answer._id, {
        status: "graded",
        isCorrect,
        submittedAt: now,
        lastModifiedAt: now,
      });

      // Record performance stats for question quality tracking
      if (answer.selectedAnswer) {
        await ctx.scheduler.runAfter(0, internal.questionPerformance.recordQuestionAttempt, {
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect,
        });
      }
    }

    return answers.length;
  },
});

// Get all answers for an attempt
export const getAnswersForAttempt = query({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .collect();
  },
});

// Get a specific answer
export const getAnswer = query({
  args: {
    attemptId: v.id("examAttempts"),
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt_and_question", (q) =>
        q.eq("attemptId", args.attemptId).eq("questionId", args.questionId)
      )
      .first();
  },
});
