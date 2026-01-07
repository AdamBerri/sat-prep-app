import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────
// ADMIN QUERIES - No user filtering, full database access
// ─────────────────────────────────────────────────────────

/**
 * Get paginated list of all questions with full details for admin review.
 * Includes options, explanations, passages, performance stats, and image URLs.
 */
export const listQuestionsForAdmin = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
    category: v.optional(
      v.union(v.literal("reading_writing"), v.literal("math"))
    ),
    domain: v.optional(v.string()),
    skill: v.optional(v.string()),
    reviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("verified"),
        v.literal("needs_revision"),
        v.literal("rejected"),
        v.literal("flagged_high_error")
      )
    ),
    hasImage: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("createdAt"),
        v.literal("errorRate"),
        v.literal("difficulty"),
        v.literal("totalAttempts")
      )
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;
    const startIndex = args.cursor ?? 0;

    // Query all questions (use index if category is specified)
    let allQuestions;
    if (args.category) {
      allQuestions = await ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      allQuestions = await ctx.db.query("questions").collect();
    }

    // Apply filters in memory
    allQuestions = allQuestions.filter((q) => {
      if (args.domain && q.domain !== args.domain) return false;
      if (args.skill && q.skill !== args.skill) return false;
      if (args.reviewStatus && q.reviewStatus !== args.reviewStatus) return false;
      if (args.hasImage !== undefined) {
        const hasImage = !!q.figure?.imageId;
        if (args.hasImage !== hasImage) return false;
      }
      if (args.searchQuery) {
        const search = args.searchQuery.toLowerCase();
        if (!q.prompt.toLowerCase().includes(search)) return false;
      }
      return true;
    });

    // Fetch all performance stats for sorting/display
    const allStats = await ctx.db.query("questionPerformanceStats").collect();
    const statsMap = new Map(
      allStats.map((s) => [s.questionId.toString(), s])
    );

    // Sort
    const sortOrder = args.sortOrder ?? "desc";
    const multiplier = sortOrder === "asc" ? 1 : -1;

    if (args.sortBy === "errorRate") {
      allQuestions.sort((a, b) => {
        const aRate = statsMap.get(a._id.toString())?.errorRate ?? 0;
        const bRate = statsMap.get(b._id.toString())?.errorRate ?? 0;
        return (aRate - bRate) * multiplier;
      });
    } else if (args.sortBy === "totalAttempts") {
      allQuestions.sort((a, b) => {
        const aAttempts = statsMap.get(a._id.toString())?.totalAttempts ?? 0;
        const bAttempts = statsMap.get(b._id.toString())?.totalAttempts ?? 0;
        return (aAttempts - bAttempts) * multiplier;
      });
    } else if (args.sortBy === "difficulty") {
      allQuestions.sort((a, b) => {
        const aDiff = a.overallDifficulty ?? a.difficulty / 3;
        const bDiff = b.overallDifficulty ?? b.difficulty / 3;
        return (aDiff - bDiff) * multiplier;
      });
    } else {
      // Default sort by _creationTime
      allQuestions.sort((a, b) => {
        return (a._creationTime - b._creationTime) * multiplier;
      });
    }

    // Paginate
    const paginated = allQuestions.slice(startIndex, startIndex + limit);

    // Enrich with related data
    const enriched = await Promise.all(
      paginated.map(async (question) => {
        // Get answer options
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();
        options.sort((a, b) => a.order - b.order);

        // Get explanation
        const explanation = await ctx.db
          .query("explanations")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .first();

        // Get passage if exists
        let passage = null;
        if (question.passageId) {
          passage = await ctx.db.get(question.passageId);
        }

        // Get passage2 for cross-text questions
        let passage2 = null;
        const passage2IdStr = (
          question.generationMetadata as { promptParameters?: { passage2Id?: string } } | undefined
        )?.promptParameters?.passage2Id;
        if (passage2IdStr) {
          try {
            passage2 = await ctx.db.get(passage2IdStr as Id<"passages">);
          } catch {
            // passage2Id might be invalid, ignore
          }
        }

        // Get performance stats
        const stats = statsMap.get(question._id.toString()) ?? null;

        // Get figure image URL
        let figureUrl = null;
        if (question.figure?.imageId) {
          const image = await ctx.db.get(question.figure.imageId);
          if (image) {
            figureUrl = await ctx.storage.getUrl(image.storageId);
          }
        }

        // Get option image URLs
        const optionsWithUrls = await Promise.all(
          options.map(async (opt) => {
            let imageUrl = null;
            if (opt.imageId) {
              const image = await ctx.db.get(opt.imageId);
              if (image) {
                imageUrl = await ctx.storage.getUrl(image.storageId);
              }
            }
            return { ...opt, imageUrl };
          })
        );

        return {
          ...question,
          options: optionsWithUrls,
          explanation,
          passage,
          passage2,
          stats,
          figureUrl,
        };
      })
    );

    return {
      questions: enriched,
      nextCursor:
        startIndex + limit < allQuestions.length ? startIndex + limit : null,
      total: allQuestions.length,
    };
  },
});

/**
 * Get overview statistics for admin dashboard.
 */
export const getAdminOverviewStats = query({
  args: {},
  handler: async (ctx) => {
    const allQuestions = await ctx.db.query("questions").collect();
    const allStats = await ctx.db.query("questionPerformanceStats").collect();

    // Group by category
    const byCategory = {
      reading_writing: allQuestions.filter((q) => q.category === "reading_writing").length,
      math: allQuestions.filter((q) => q.category === "math").length,
    };

    // Group by review status
    const byReviewStatus: Record<string, number> = {
      pending: 0,
      verified: 0,
      needs_revision: 0,
      rejected: 0,
      flagged_high_error: 0,
      unset: 0,
    };
    for (const q of allQuestions) {
      if (q.reviewStatus) {
        byReviewStatus[q.reviewStatus]++;
      } else {
        byReviewStatus.unset++;
      }
    }

    // Questions with images
    const withImages = allQuestions.filter((q) => q.figure?.imageId).length;

    // Performance metrics
    const statsWithData = allStats.filter((s) => s.totalAttempts >= 10);
    const avgErrorRate =
      statsWithData.length > 0
        ? statsWithData.reduce((sum, s) => sum + s.errorRate, 0) /
          statsWithData.length
        : 0;

    const flaggedCount = allStats.filter((s) => s.flaggedForReview).length;
    const totalAttempts = allStats.reduce((sum, s) => sum + s.totalAttempts, 0);

    // Domain distribution
    const byDomain: Record<string, number> = {};
    for (const q of allQuestions) {
      byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
    }

    // Source distribution
    const bySource: Record<string, number> = {};
    for (const q of allQuestions) {
      const sourceType = q.source?.type ?? "unknown";
      bySource[sourceType] = (bySource[sourceType] || 0) + 1;
    }

    return {
      totalQuestions: allQuestions.length,
      byCategory,
      byReviewStatus,
      withImages,
      avgErrorRate,
      flaggedCount,
      totalAttempts,
      byDomain,
      bySource,
    };
  },
});

/**
 * Get available filter options (domains, skills) for admin filters.
 */
export const getFilterOptions = query({
  args: {},
  handler: async (ctx) => {
    const allQuestions = await ctx.db.query("questions").collect();

    const domains = new Set<string>();
    const skills = new Set<string>();
    const domainToSkills: Record<string, Set<string>> = {};

    for (const q of allQuestions) {
      domains.add(q.domain);
      skills.add(q.skill);

      if (!domainToSkills[q.domain]) {
        domainToSkills[q.domain] = new Set();
      }
      domainToSkills[q.domain].add(q.skill);
    }

    return {
      domains: Array.from(domains).sort(),
      skills: Array.from(skills).sort(),
      domainToSkills: Object.fromEntries(
        Object.entries(domainToSkills).map(([d, s]) => [d, Array.from(s).sort()])
      ),
    };
  },
});

/**
 * Get a single question with full details for admin review.
 */
export const getQuestionDetailForAdmin = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    // Get answer options
    const options = await ctx.db
      .query("answerOptions")
      .withIndex("by_question", (q) => q.eq("questionId", question._id))
      .collect();
    options.sort((a, b) => a.order - b.order);

    // Get explanation
    const explanation = await ctx.db
      .query("explanations")
      .withIndex("by_question", (q) => q.eq("questionId", question._id))
      .first();

    // Get passage if exists
    let passage = null;
    if (question.passageId) {
      passage = await ctx.db.get(question.passageId);
    }

    // Get passage2 for cross-text questions
    let passage2 = null;
    const passage2IdStr = (
      question.generationMetadata as { promptParameters?: { passage2Id?: string } } | undefined
    )?.promptParameters?.passage2Id;
    if (passage2IdStr) {
      try {
        passage2 = await ctx.db.get(passage2IdStr as Id<"passages">);
      } catch {
        // passage2Id might be invalid, ignore
      }
    }

    // Get performance stats
    const stats = await ctx.db
      .query("questionPerformanceStats")
      .withIndex("by_question", (q) => q.eq("questionId", question._id))
      .first();

    // Get figure image URL and metadata
    let figureUrl = null;
    let figureMetadata = null;
    if (question.figure?.imageId) {
      const image = await ctx.db.get(question.figure.imageId);
      if (image) {
        figureUrl = await ctx.storage.getUrl(image.storageId);
        figureMetadata = {
          width: image.width,
          height: image.height,
          altText: image.altText,
        };
      }
    }

    // Get option images
    const optionsWithUrls = await Promise.all(
      options.map(async (opt) => {
        let imageUrl = null;
        let imageMetadata = null;
        if (opt.imageId) {
          const image = await ctx.db.get(opt.imageId);
          if (image) {
            imageUrl = await ctx.storage.getUrl(image.storageId);
            imageMetadata = { width: image.width, height: image.height };
          }
        }
        return { ...opt, imageUrl, imageMetadata };
      })
    );

    return {
      ...question,
      options: optionsWithUrls,
      explanation,
      passage,
      passage2,
      stats,
      figureUrl,
      figureMetadata,
    };
  },
});

// ─────────────────────────────────────────────────────────
// ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────

/**
 * Update a question's review status (for admin approve/reject actions).
 */
export const setQuestionReviewStatus = mutation({
  args: {
    questionId: v.id("questions"),
    reviewStatus: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("needs_revision"),
      v.literal("rejected"),
      v.literal("flagged_high_error")
    ),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    await ctx.db.patch(args.questionId, {
      reviewStatus: args.reviewStatus,
      lastReviewedAt: Date.now(),
      reviewMetadata: {
        reviewVersion: "admin_manual",
        answerValidated: args.reviewStatus === "verified",
        confidenceScore: 1.0,
        reviewNotes: args.reviewNotes,
      },
    });

    return { success: true };
  },
});
