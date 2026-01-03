import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────

const ERROR_RATE_THRESHOLDS = {
  FLAG_FOR_REVIEW: 0.7, // 70% error rate = flag
  URGENT_REVIEW: 0.85, // 85% error rate = urgent
  MIN_ATTEMPTS_FOR_FLAG: 30, // Need 30+ attempts before flagging
};

// ─────────────────────────────────────────────────────────
// RECORD QUESTION ATTEMPT (called after each answer)
// ─────────────────────────────────────────────────────────

/**
 * Record a student's attempt at a question.
 * Updates performance stats and flags for review if error rate is high.
 * This is an internal mutation called from endless.ts and answers.ts.
 */
export const recordQuestionAttempt = internalMutation({
  args: {
    questionId: v.id("questions"),
    selectedAnswer: v.string(),
    isCorrect: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing stats or create new
    const existingStats = await ctx.db
      .query("questionPerformanceStats")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();

    if (existingStats) {
      // Update existing stats
      const newTotalAttempts = existingStats.totalAttempts + 1;
      const newCorrectAttempts =
        existingStats.correctAttempts + (args.isCorrect ? 1 : 0);
      const newErrorRate = 1 - newCorrectAttempts / newTotalAttempts;

      // Update answer distribution
      const answerKey = args.selectedAnswer as "A" | "B" | "C" | "D";
      const newDistribution = { ...existingStats.answerDistribution };
      if (answerKey in newDistribution) {
        newDistribution[answerKey] = newDistribution[answerKey] + 1;
      }

      // Find most common wrong answer
      const question = await ctx.db.get(args.questionId);
      let mostCommonWrongAnswer: string | undefined;
      if (question) {
        let maxWrongCount = 0;
        for (const [key, count] of Object.entries(newDistribution)) {
          if (key !== question.correctAnswer && count > maxWrongCount) {
            maxWrongCount = count;
            mostCommonWrongAnswer = key;
          }
        }
      }

      // Check if should be flagged for review
      let flaggedForReview = existingStats.flaggedForReview;
      let flagReason = existingStats.flagReason;

      if (
        !flaggedForReview &&
        newTotalAttempts >= ERROR_RATE_THRESHOLDS.MIN_ATTEMPTS_FOR_FLAG &&
        newErrorRate >= ERROR_RATE_THRESHOLDS.FLAG_FOR_REVIEW
      ) {
        flaggedForReview = true;
        flagReason = `High error rate: ${(newErrorRate * 100).toFixed(1)}% after ${newTotalAttempts} attempts`;

        // Also update the question's review status to flagged_high_error
        if (question && question.reviewStatus === "verified") {
          await ctx.db.patch(args.questionId, {
            reviewStatus: "flagged_high_error",
          });
        }
      }

      await ctx.db.patch(existingStats._id, {
        totalAttempts: newTotalAttempts,
        correctAttempts: newCorrectAttempts,
        errorRate: newErrorRate,
        answerDistribution: newDistribution,
        mostCommonWrongAnswer,
        flaggedForReview,
        flagReason,
        lastUpdatedAt: now,
      });

      return {
        totalAttempts: newTotalAttempts,
        errorRate: newErrorRate,
        flaggedForReview,
      };
    } else {
      // Create new stats
      const answerKey = args.selectedAnswer as "A" | "B" | "C" | "D";
      const distribution = { A: 0, B: 0, C: 0, D: 0 };
      if (answerKey in distribution) {
        distribution[answerKey] = 1;
      }

      const errorRate = args.isCorrect ? 0 : 1;

      await ctx.db.insert("questionPerformanceStats", {
        questionId: args.questionId,
        totalAttempts: 1,
        correctAttempts: args.isCorrect ? 1 : 0,
        errorRate,
        answerDistribution: distribution,
        mostCommonWrongAnswer: args.isCorrect ? undefined : args.selectedAnswer,
        flaggedForReview: false,
        lastUpdatedAt: now,
      });

      return {
        totalAttempts: 1,
        errorRate,
        flaggedForReview: false,
      };
    }
  },
});

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

/**
 * Get performance stats for a specific question.
 */
export const getQuestionStats = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("questionPerformanceStats")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();
  },
});

/**
 * Get questions with high error rates (problematic questions).
 * Used for admin dashboard and quality auditing.
 */
export const getProblematicQuestions = query({
  args: {
    minAttempts: v.optional(v.number()),
    minErrorRate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minAttempts = args.minAttempts ?? 30;
    const minErrorRate = args.minErrorRate ?? 0.7;
    const limit = args.limit ?? 50;

    // Get all stats with sufficient attempts
    const allStats = await ctx.db
      .query("questionPerformanceStats")
      .collect();

    // Filter and sort by error rate
    const problematic = allStats
      .filter(
        (s) => s.totalAttempts >= minAttempts && s.errorRate >= minErrorRate
      )
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);

    // Fetch question details for each
    const withQuestions = await Promise.all(
      problematic.map(async (stats) => {
        const question = await ctx.db.get(stats.questionId);
        return {
          stats,
          question,
        };
      })
    );

    return withQuestions.filter((item) => item.question !== null);
  },
});

/**
 * Get questions flagged for review.
 */
export const getFlaggedQuestions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const flagged = await ctx.db
      .query("questionPerformanceStats")
      .withIndex("by_flagged", (q) => q.eq("flaggedForReview", true))
      .take(limit);

    // Fetch question details for each
    const withQuestions = await Promise.all(
      flagged.map(async (stats) => {
        const question = await ctx.db.get(stats.questionId);
        return {
          stats,
          question,
        };
      })
    );

    return withQuestions.filter((item) => item.question !== null);
  },
});

/**
 * Get overall question quality dashboard stats.
 */
export const getQuestionQualityDashboard = query({
  args: {},
  handler: async (ctx) => {
    // Get all questions
    const allQuestions = await ctx.db.query("questions").collect();

    // Get all performance stats
    const allStats = await ctx.db
      .query("questionPerformanceStats")
      .collect();

    // Group questions by review status
    const byReviewStatus = {
      pending: 0,
      verified: 0,
      needs_revision: 0,
      rejected: 0,
      flagged_high_error: 0,
      unset: 0, // Questions without review status (legacy)
    };

    for (const q of allQuestions) {
      if (q.reviewStatus) {
        byReviewStatus[q.reviewStatus]++;
      } else {
        byReviewStatus.unset++;
      }
    }

    // Calculate average error rate (for questions with 10+ attempts)
    const statsWithSufficientData = allStats.filter(
      (s) => s.totalAttempts >= 10
    );
    const averageErrorRate =
      statsWithSufficientData.length > 0
        ? statsWithSufficientData.reduce((sum, s) => sum + s.errorRate, 0) /
          statsWithSufficientData.length
        : 0;

    // Count flagged questions
    const flaggedCount = allStats.filter((s) => s.flaggedForReview).length;

    // Get top 10 worst performing questions
    const worstPerforming = allStats
      .filter((s) => s.totalAttempts >= 30)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);

    // Total attempts across all questions
    const totalAttempts = allStats.reduce((sum, s) => sum + s.totalAttempts, 0);

    return {
      totalQuestions: allQuestions.length,
      questionsWithStats: allStats.length,
      byReviewStatus,
      averageErrorRate,
      flaggedCount,
      worstPerformingQuestionIds: worstPerforming.map((s) => s.questionId),
      totalAttempts,
    };
  },
});

// ─────────────────────────────────────────────────────────
// ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────

/**
 * Clear the flagged status for a question (after manual review).
 */
export const clearQuestionFlag = mutation({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("questionPerformanceStats")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        flaggedForReview: false,
        flagReason: undefined,
      });
    }

    // Also update question review status back to verified
    const question = await ctx.db.get(args.questionId);
    if (question && question.reviewStatus === "flagged_high_error") {
      await ctx.db.patch(args.questionId, {
        reviewStatus: "verified",
      });
    }

    return { success: true };
  },
});

/**
 * Reset performance stats for a question (useful after fixing a question).
 */
export const resetQuestionStats = mutation({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("questionPerformanceStats")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();

    if (stats) {
      await ctx.db.delete(stats._id);
    }

    return { success: true };
  },
});
