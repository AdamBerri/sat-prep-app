import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────
// INTERNAL MUTATIONS FOR UPDATING REVIEW STATUS
// ─────────────────────────────────────────────────────────

export const updateQuestionReviewStatus = internalMutation({
  args: {
    questionId: v.id("questions"),
    reviewStatus: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("needs_revision"),
      v.literal("rejected"),
      v.literal("flagged_high_error")
    ),
    reviewMetadata: v.object({
      reviewVersion: v.string(),
      answerValidated: v.boolean(),
      originalCorrectAnswer: v.optional(v.string()),
      confidenceScore: v.number(),
      reviewNotes: v.optional(v.string()),
    }),
    newCorrectAnswer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const updates: Partial<Doc<"questions">> = {
      reviewStatus: args.reviewStatus,
      lastReviewedAt: now,
      reviewMetadata: args.reviewMetadata,
    };

    // If the answer was wrong and needs to be corrected
    if (args.newCorrectAnswer && args.newCorrectAnswer !== "") {
      updates.correctAnswer = args.newCorrectAnswer;
    }

    await ctx.db.patch(args.questionId, updates);

    return { success: true };
  },
});

export const updateQuestionExplanations = internalMutation({
  args: {
    questionId: v.id("questions"),
    correctExplanation: v.string(),
    wrongAnswerExplanations: v.object({
      A: v.optional(v.string()),
      B: v.optional(v.string()),
      C: v.optional(v.string()),
      D: v.optional(v.string()),
    }),
    commonMistakes: v.array(
      v.object({
        reason: v.string(),
        description: v.string(),
        relatedSkill: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Find existing explanation
    const existing = await ctx.db
      .query("explanations")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        correctExplanation: args.correctExplanation,
        wrongAnswerExplanations: args.wrongAnswerExplanations,
        commonMistakes: args.commonMistakes,
      });
    } else {
      await ctx.db.insert("explanations", {
        questionId: args.questionId,
        correctExplanation: args.correctExplanation,
        wrongAnswerExplanations: args.wrongAnswerExplanations,
        commonMistakes: args.commonMistakes,
      });
    }

    return { success: true };
  },
});

export const addToReviewDLQ = internalMutation({
  args: {
    questionId: v.id("questions"),
    reviewType: v.union(
      v.literal("initial_verification"),
      v.literal("high_error_rate_recheck")
    ),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("questionReviewDLQ", {
      questionId: args.questionId,
      reviewType: args.reviewType,
      error: args.error,
      retryCount: 0,
      maxRetries: 3,
      lastAttemptAt: Date.now(),
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

export const getQuestionForReview = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    // Get answer options
    const options = await ctx.db
      .query("answerOptions")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .collect();

    // Get passage if applicable
    let passage = null;
    if (question.passageId) {
      passage = await ctx.db.get(question.passageId);
    }

    // Get existing explanation
    const explanation = await ctx.db
      .query("explanations")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();

    return { question, options, passage, explanation };
  },
});

export const getUnverifiedQuestions = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.union(v.literal("reading_writing"), v.literal("math"))),
    prioritizeGraphing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get all agent-generated questions
    let questions = await ctx.db.query("questions").collect();

    // Filter to agent-generated questions
    questions = questions.filter(
      (q) => q.source?.type === "agent_generated"
    );

    // Filter by category if specified
    if (args.category) {
      questions = questions.filter((q) => q.category === args.category);
    }

    // Filter to unverified (pending or undefined reviewStatus)
    questions = questions.filter(
      (q) => !q.reviewStatus || q.reviewStatus === "pending"
    );

    // Sort: prioritize graphing questions if requested
    if (args.prioritizeGraphing) {
      questions.sort((a, b) => {
        const aHasFigure = a.figure ? 1 : 0;
        const bHasFigure = b.figure ? 1 : 0;
        return bHasFigure - aHasFigure; // Figures first
      });
    }

    return questions.slice(0, limit);
  },
});

export const getUnreviewedQuestionCount = query({
  args: {
    category: v.optional(v.union(v.literal("reading_writing"), v.literal("math"))),
  },
  handler: async (ctx, args) => {
    let questions = await ctx.db.query("questions").collect();

    // Filter to agent-generated
    questions = questions.filter(
      (q) => q.source?.type === "agent_generated"
    );

    // Filter by category
    if (args.category) {
      questions = questions.filter((q) => q.category === args.category);
    }

    // Count by status
    const pending = questions.filter(
      (q) => !q.reviewStatus || q.reviewStatus === "pending"
    ).length;

    const verified = questions.filter(
      (q) => q.reviewStatus === "verified"
    ).length;

    const needsRevision = questions.filter(
      (q) => q.reviewStatus === "needs_revision"
    ).length;

    const rejected = questions.filter(
      (q) => q.reviewStatus === "rejected"
    ).length;

    const flaggedHighError = questions.filter(
      (q) => q.reviewStatus === "flagged_high_error"
    ).length;

    return {
      total: questions.length,
      pending,
      verified,
      needsRevision,
      rejected,
      flaggedHighError,
    };
  },
});

/**
 * Get questions needing review (for admin dashboard).
 */
export const getQuestionsNeedingReview = query({
  args: {
    limit: v.optional(v.number()),
    includeNeedsRevision: v.optional(v.boolean()),
    includeFlagged: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let questions = await ctx.db.query("questions").collect();

    // Filter to agent-generated
    questions = questions.filter(
      (q) => q.source?.type === "agent_generated"
    );

    // Filter by status
    questions = questions.filter((q) => {
      if (!q.reviewStatus || q.reviewStatus === "pending") return true;
      if (args.includeNeedsRevision && q.reviewStatus === "needs_revision")
        return true;
      if (args.includeFlagged && q.reviewStatus === "flagged_high_error")
        return true;
      return false;
    });

    return questions.slice(0, limit);
  },
});
