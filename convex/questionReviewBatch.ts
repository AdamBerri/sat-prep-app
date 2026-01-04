import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// BATCH QUERY - Get all data needed for batch review
// ─────────────────────────────────────────────────────────

export const getPendingQuestionsForBatch = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    // Use index for efficient query
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "pending"))
      .take(args.limit);

    // Fetch all related data in parallel for each question
    const results = await Promise.all(
      questions.map(async (question) => {
        const [options, passage, explanation, image] = await Promise.all([
          ctx.db
            .query("answerOptions")
            .withIndex("by_question", (q) => q.eq("questionId", question._id))
            .collect(),
          question.passageId ? ctx.db.get(question.passageId) : null,
          ctx.db
            .query("explanations")
            .withIndex("by_question", (q) => q.eq("questionId", question._id))
            .first(),
          question.figure?.imageId ? ctx.db.get(question.figure.imageId) : null,
        ]);

        return {
          question,
          options: options.sort((a, b) => a.order - b.order),
          passage,
          explanation,
          image,
        };
      })
    );

    return results;
  },
});

// Internal version for use in actions
export const getPendingQuestionsForBatchInternal = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "pending"))
      .take(args.limit);

    const results = await Promise.all(
      questions.map(async (question) => {
        const [options, passage, explanation, image] = await Promise.all([
          ctx.db
            .query("answerOptions")
            .withIndex("by_question", (q) => q.eq("questionId", question._id))
            .collect(),
          question.passageId ? ctx.db.get(question.passageId) : null,
          ctx.db
            .query("explanations")
            .withIndex("by_question", (q) => q.eq("questionId", question._id))
            .first(),
          question.figure?.imageId ? ctx.db.get(question.figure.imageId) : null,
        ]);

        return {
          question,
          options: options.sort((a, b) => a.order - b.order),
          passage,
          explanation,
          image,
        };
      })
    );

    return results;
  },
});

// ─────────────────────────────────────────────────────────
// GET IMAGE URL - For local script to fetch images
// ─────────────────────────────────────────────────────────

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ─────────────────────────────────────────────────────────
// BULK UPDATE - Apply all review results in one mutation
// ─────────────────────────────────────────────────────────

const reviewResultValidator = v.object({
  questionId: v.id("questions"),
  reviewStatus: v.union(
    v.literal("verified"),
    v.literal("needs_revision"),
    v.literal("rejected")
  ),
  newCorrectAnswer: v.optional(v.string()),
  reviewMetadata: v.object({
    reviewVersion: v.string(),
    answerValidated: v.boolean(),
    originalCorrectAnswer: v.optional(v.string()),
    confidenceScore: v.number(),
    reviewNotes: v.optional(v.string()),
  }),
  explanation: v.object({
    correctExplanation: v.string(),
    wrongAnswerExplanations: v.object({
      A: v.optional(v.string()),
      B: v.optional(v.string()),
      C: v.optional(v.string()),
      D: v.optional(v.string()),
    }),
    commonMistakes: v.optional(
      v.array(
        v.object({
          reason: v.string(),
          description: v.string(),
          relatedSkill: v.optional(v.string()),
        })
      )
    ),
  }),
});

export const bulkUpdateReviewResults = mutation({
  args: {
    results: v.array(reviewResultValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;
    let explanationsCreated = 0;
    let explanationsUpdated = 0;

    for (const result of args.results) {
      // Update question status
      const updateData: {
        reviewStatus: typeof result.reviewStatus;
        reviewMetadata: typeof result.reviewMetadata;
        lastReviewedAt: number;
        correctAnswer?: string;
      } = {
        reviewStatus: result.reviewStatus,
        reviewMetadata: result.reviewMetadata,
        lastReviewedAt: now,
      };

      // If answer was corrected, update it
      if (result.newCorrectAnswer) {
        updateData.correctAnswer = result.newCorrectAnswer;
      }

      await ctx.db.patch(result.questionId, updateData);
      updated++;

      // Update or create explanation
      const existingExplanation = await ctx.db
        .query("explanations")
        .withIndex("by_question", (q) => q.eq("questionId", result.questionId))
        .first();

      if (existingExplanation) {
        await ctx.db.patch(existingExplanation._id, {
          correctExplanation: result.explanation.correctExplanation,
          wrongAnswerExplanations: result.explanation.wrongAnswerExplanations,
          commonMistakes: result.explanation.commonMistakes,
        });
        explanationsUpdated++;
      } else {
        await ctx.db.insert("explanations", {
          questionId: result.questionId,
          correctExplanation: result.explanation.correctExplanation,
          wrongAnswerExplanations: result.explanation.wrongAnswerExplanations,
          commonMistakes: result.explanation.commonMistakes,
        });
        explanationsCreated++;
      }
    }

    return {
      updated,
      explanationsCreated,
      explanationsUpdated,
    };
  },
});

// Internal version for use in actions
export const bulkUpdateReviewResultsInternal = internalMutation({
  args: {
    results: v.array(reviewResultValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;

    for (const result of args.results) {
      const updateData: {
        reviewStatus: typeof result.reviewStatus;
        reviewMetadata: typeof result.reviewMetadata;
        lastReviewedAt: number;
        correctAnswer?: string;
      } = {
        reviewStatus: result.reviewStatus,
        reviewMetadata: result.reviewMetadata,
        lastReviewedAt: now,
      };

      if (result.newCorrectAnswer) {
        updateData.correctAnswer = result.newCorrectAnswer;
      }

      await ctx.db.patch(result.questionId, updateData);
      updated++;

      // Update or create explanation
      const existingExplanation = await ctx.db
        .query("explanations")
        .withIndex("by_question", (q) => q.eq("questionId", result.questionId))
        .first();

      if (existingExplanation) {
        await ctx.db.patch(existingExplanation._id, {
          correctExplanation: result.explanation.correctExplanation,
          wrongAnswerExplanations: result.explanation.wrongAnswerExplanations,
          commonMistakes: result.explanation.commonMistakes,
        });
      } else {
        await ctx.db.insert("explanations", {
          questionId: result.questionId,
          correctExplanation: result.explanation.correctExplanation,
          wrongAnswerExplanations: result.explanation.wrongAnswerExplanations,
          commonMistakes: result.explanation.commonMistakes,
        });
      }
    }

    return { updated };
  },
});

// ─────────────────────────────────────────────────────────
// STATUS QUERIES
// ─────────────────────────────────────────────────────────

export const getReviewStats = query({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "pending"))
      .collect();

    const verified = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "verified"))
      .collect();

    const needsRevision = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "needs_revision"))
      .collect();

    const rejected = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "rejected"))
      .collect();

    return {
      pending: pending.length,
      verified: verified.length,
      needsRevision: needsRevision.length,
      rejected: rejected.length,
      total: pending.length + verified.length + needsRevision.length + rejected.length,
    };
  },
});
