import { query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// DIFFICULTY COMPUTATION HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Compute overall difficulty from category-specific factors.
 * Uses equal weighting by default - can be customized for different strategies.
 */
export function computeOverallDifficulty(
  category: "reading_writing" | "math",
  factors:
    | {
        reasoningSteps: number;
        algebraicComplexity: number;
        conceptualDepth: number;
        computationLoad: number;
        multiStepRequired: number;
      }
    | {
        passageComplexity: number;
        inferenceDepth: number;
        vocabularyLevel: number;
        evidenceEvaluation: number;
        synthesisRequired: number;
      }
    | undefined
): number {
  if (!factors) return 0.5; // Default mid-range

  const values = Object.values(factors) as number[];
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Convert 0.0-1.0 difficulty to legacy 1-3 scale.
 */
export function difficultyToLegacy(overallDifficulty: number): number {
  if (overallDifficulty < 0.33) return 1;
  if (overallDifficulty < 0.67) return 2;
  return 3;
}

/**
 * Convert legacy 1-3 to 0.0-1.0 scale.
 */
export function legacyToDifficulty(legacy: number): number {
  return (legacy - 1) / 2; // 1->0, 2->0.5, 3->1.0
}

// ─────────────────────────────────────────────────────────
// PAGINATED QUERY BY DIFFICULTY RANGE
// ─────────────────────────────────────────────────────────

/**
 * Get questions within a difficulty range with optional filters.
 * Optimized for endless mode at scale.
 */
export const getQuestionsByDifficultyRange = query({
  args: {
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    minDifficulty: v.number(),
    maxDifficulty: v.number(),
    domain: v.optional(v.string()),
    skill: v.optional(v.string()),
    excludeIds: v.optional(v.array(v.id("questions"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const excludeSet = new Set(args.excludeIds ?? []);

    // Query using composite index for category + difficulty
    const allQuestions = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Filter by difficulty range and other criteria
    const filtered = allQuestions.filter((q) => {
      // Use overallDifficulty if available, otherwise convert legacy
      const diff = q.overallDifficulty ?? legacyToDifficulty(q.difficulty);

      if (diff < args.minDifficulty || diff > args.maxDifficulty) return false;
      if (excludeSet.has(q._id)) return false;
      if (args.domain && q.domain !== args.domain) return false;
      if (args.skill && q.skill !== args.skill) return false;
      return true;
    });

    // Limit results
    const limited = filtered.slice(0, limit);

    // Fetch options for each question
    const questionsWithOptions = await Promise.all(
      limited.map(async (question) => {
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();
        options.sort((a, b) => a.order - b.order);
        return { ...question, options };
      })
    );

    return {
      questions: questionsWithOptions,
      hasMore: filtered.length > limit,
      totalAvailable: filtered.length,
    };
  },
});

// ─────────────────────────────────────────────────────────
// ADAPTIVE DIFFICULTY SELECTION FOR ENDLESS MODE
// ─────────────────────────────────────────────────────────

/**
 * Select next question adaptively based on user's skill level.
 * Prioritizes weak skills and targets appropriate difficulty.
 */
export const selectAdaptiveQuestion = query({
  args: {
    visitorId: v.string(),
    category: v.optional(v.union(v.literal("reading_writing"), v.literal("math"))),
    excludeIds: v.array(v.id("questions")),
    targetDifficulty: v.optional(v.number()), // 0.0-1.0
    difficultyTolerance: v.optional(v.number()), // +/- range
  },
  handler: async (ctx, args) => {
    const targetDiff = args.targetDifficulty ?? 0.5;
    const tolerance = args.difficultyTolerance ?? 0.2;
    const excludeSet = new Set(args.excludeIds);

    // Get user's skill mastery to inform selection
    const masteries = await ctx.db
      .query("skillMastery")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    // Find weak skills (lower mastery)
    const weakSkills = masteries
      .filter((m) => !args.category || m.category === args.category)
      .filter((m) => m.masteryPoints < 500)
      .map((m) => m.skill);

    // Query questions
    let questions = await ctx.db.query("questions").collect();

    // Filter by category if specified
    if (args.category) {
      questions = questions.filter((q) => q.category === args.category);
    }

    // Score candidates
    const scored = questions
      .filter((q) => !excludeSet.has(q._id))
      .map((q) => {
        let score = 0;

        // Get effective difficulty
        const diff = q.overallDifficulty ?? legacyToDifficulty(q.difficulty);

        // Skip if outside tolerance range
        if (Math.abs(diff - targetDiff) > tolerance) {
          return { question: q, score: -1 };
        }

        // Weak skill bonus (30 points)
        if (weakSkills.includes(q.skill)) {
          score += 30;
        }

        // Closer to target difficulty = higher score (up to 20 points)
        const diffDelta = Math.abs(diff - targetDiff);
        score += (1 - diffDelta / tolerance) * 20;

        // Randomization factor (up to 10 points)
        score += Math.random() * 10;

        return { question: q, score };
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const selected = scored[0].question;

    // Fetch options
    const options = await ctx.db
      .query("answerOptions")
      .withIndex("by_question", (q) => q.eq("questionId", selected._id))
      .collect();
    options.sort((a, b) => a.order - b.order);

    // Fetch passage if needed
    let passage = null;
    if (selected.passageId) {
      passage = await ctx.db.get(selected.passageId);
    }

    return { ...selected, options, passage };
  },
});

// ─────────────────────────────────────────────────────────
// BULK FETCH WITH PRELOADED OPTIONS (avoid N+1)
// ─────────────────────────────────────────────────────────

/**
 * Fetch multiple questions with their options in bulk.
 * More efficient than individual fetches.
 */
export const getQuestionsWithOptionsBulk = query({
  args: {
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    // Fetch all questions
    const questions = await Promise.all(
      args.questionIds.map((id) => ctx.db.get(id))
    );

    // Fetch all options in parallel
    const optionsByQuestion = await Promise.all(
      args.questionIds.map(async (questionId) => {
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", questionId))
          .collect();
        return {
          questionId,
          options: options.sort((a, b) => a.order - b.order),
        };
      })
    );

    // Build lookup map
    const optionsMap = new Map(
      optionsByQuestion.map((o) => [o.questionId.toString(), o.options])
    );

    return questions
      .filter((q): q is NonNullable<typeof q> => q !== null)
      .map((q) => ({
        ...q,
        options: optionsMap.get(q._id.toString()) ?? [],
      }));
  },
});

// ─────────────────────────────────────────────────────────
// DIFFICULTY DISTRIBUTION QUERY
// ─────────────────────────────────────────────────────────

/**
 * Get distribution of questions by difficulty for a category.
 * Useful for understanding available question pool.
 */
export const getDifficultyDistribution = query({
  args: {
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let questions = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    if (args.domain) {
      questions = questions.filter((q) => q.domain === args.domain);
    }

    // Bucket questions by difficulty ranges
    const buckets = {
      easy: 0, // 0.0-0.33
      medium: 0, // 0.33-0.67
      hard: 0, // 0.67-1.0
    };

    const byDomain: Record<string, { easy: number; medium: number; hard: number }> = {};
    const bySkill: Record<string, { easy: number; medium: number; hard: number }> = {};

    for (const q of questions) {
      const diff = q.overallDifficulty ?? legacyToDifficulty(q.difficulty);
      const bucket = diff < 0.33 ? "easy" : diff < 0.67 ? "medium" : "hard";

      buckets[bucket]++;

      // By domain
      if (!byDomain[q.domain]) {
        byDomain[q.domain] = { easy: 0, medium: 0, hard: 0 };
      }
      byDomain[q.domain][bucket]++;

      // By skill
      if (!bySkill[q.skill]) {
        bySkill[q.skill] = { easy: 0, medium: 0, hard: 0 };
      }
      bySkill[q.skill][bucket]++;
    }

    return {
      total: questions.length,
      overall: buckets,
      byDomain,
      bySkill,
    };
  },
});

// ─────────────────────────────────────────────────────────
// QUESTIONS BY FACTOR FILTER
// ─────────────────────────────────────────────────────────

/**
 * Query questions by specific difficulty factors.
 * Allows targeting specific aspects like "high reasoning, low computation".
 */
export const getQuestionsByFactors = query({
  args: {
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    factorFilters: v.array(
      v.object({
        factor: v.string(),
        min: v.number(),
        max: v.number(),
      })
    ),
    excludeIds: v.optional(v.array(v.id("questions"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const excludeSet = new Set(args.excludeIds ?? []);

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    const filtered = questions.filter((q) => {
      if (excludeSet.has(q._id)) return false;

      // Get the appropriate difficulty factors
      const factors =
        args.category === "math" ? q.mathDifficulty : q.rwDifficulty;

      if (!factors) return false;

      // Check all factor filters
      for (const filter of args.factorFilters) {
        const value = (factors as Record<string, number>)[filter.factor];
        if (value === undefined) return false;
        if (value < filter.min || value > filter.max) return false;
      }

      return true;
    });

    const limited = filtered.slice(0, limit);

    // Fetch options
    const questionsWithOptions = await Promise.all(
      limited.map(async (question) => {
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();
        options.sort((a, b) => a.order - b.order);
        return { ...question, options };
      })
    );

    return {
      questions: questionsWithOptions,
      hasMore: filtered.length > limit,
      totalMatching: filtered.length,
    };
  },
});
