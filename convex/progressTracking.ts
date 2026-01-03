import { query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// WRONG ANSWERS QUERY
// ─────────────────────────────────────────────────────────

/**
 * Get all questions a user got wrong, across all practice modes.
 * Returns the latest attempt per question, grouped with question metadata.
 */
export const getWrongAnswers = query({
  args: {
    visitorId: v.string(),
    category: v.optional(
      v.union(v.literal("reading_writing"), v.literal("math"))
    ),
    domain: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Get all wrong answers for this user
    const allWrongAnswers = await ctx.db
      .query("userAnswers")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    // Filter to only wrong answers with graded status
    const wrongAnswers = allWrongAnswers.filter(
      (a) => a.isCorrect === false && a.status === "graded"
    );

    // Group by questionId, keeping only the most recent attempt per question
    const latestByQuestion = new Map<
      string,
      (typeof wrongAnswers)[0]
    >();

    for (const answer of wrongAnswers) {
      const existing = latestByQuestion.get(answer.questionId);
      if (
        !existing ||
        (answer.submittedAt ?? 0) > (existing.submittedAt ?? 0)
      ) {
        latestByQuestion.set(answer.questionId, answer);
      }
    }

    // Convert to array and sort by recency
    let latestWrongAnswers = Array.from(latestByQuestion.values()).sort(
      (a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0)
    );

    // Enrich with question data
    const enrichedAnswers = await Promise.all(
      latestWrongAnswers.map(async (answer) => {
        const question = await ctx.db.get(answer.questionId);
        if (!question) return null;

        // Apply category filter
        if (args.category && question.category !== args.category) {
          return null;
        }

        // Apply domain filter
        if (args.domain && question.domain !== args.domain) {
          return null;
        }

        // Get the attempt for mode context
        const attempt = await ctx.db.get(answer.attemptId);

        // Get answer options
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", answer.questionId))
          .collect();

        // Get explanation if available
        const explanation = await ctx.db
          .query("explanations")
          .withIndex("by_question", (q) => q.eq("questionId", answer.questionId))
          .first();

        // Check if user has since gotten this question right
        const allAttemptsOnQuestion = wrongAnswers.filter(
          (a) => a.questionId === answer.questionId
        );
        const correctAttempts = allWrongAnswers.filter(
          (a) => a.questionId === answer.questionId && a.isCorrect === true
        );
        const hasImproved = correctAttempts.length > 0;

        return {
          answerId: answer._id,
          attemptId: answer.attemptId,
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: question.correctAnswer,
          submittedAt: answer.submittedAt,
          timeSpentMs: answer.timeSpentMs,
          // Question metadata
          category: question.category,
          domain: question.domain,
          skill: question.skill,
          difficulty: question.difficulty,
          prompt: question.prompt,
          // Options for display
          options: options.sort((a, b) => a.order - b.order).map((o) => ({
            key: o.key,
            content: o.content,
          })),
          // Attempt context
          mode: attempt?.mode,
          // Improvement tracking
          hasImproved,
          totalAttempts: allAttemptsOnQuestion.length + correctAttempts.length,
          // Explanation
          explanation: explanation
            ? {
                correctExplanation: explanation.correctExplanation,
                wrongAnswerExplanations: explanation.wrongAnswerExplanations,
                commonMistakes: explanation.commonMistakes,
              }
            : null,
        };
      })
    );

    // Filter out nulls and apply pagination
    const filtered = enrichedAnswers.filter((a) => a !== null);
    const paginated = filtered.slice(offset, offset + limit);

    return {
      wrongAnswers: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    };
  },
});

// ─────────────────────────────────────────────────────────
// PREVIOUS ATTEMPTS QUERY
// ─────────────────────────────────────────────────────────

/**
 * Get all previous attempts on a specific question by a user.
 * Used for "See what I chose last time" feature.
 */
export const getPreviousAttempts = query({
  args: {
    visitorId: v.string(),
    questionId: v.id("questions"),
    excludeAttemptId: v.optional(v.id("examAttempts")),
  },
  handler: async (ctx, args) => {
    // Get all answers for this question by this user
    const allAnswers = await ctx.db
      .query("userAnswers")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    // Filter to this question and graded status
    let questionAnswers = allAnswers.filter(
      (a) =>
        a.questionId === args.questionId &&
        a.status === "graded" &&
        a.selectedAnswer !== undefined
    );

    // Exclude current attempt if specified
    if (args.excludeAttemptId) {
      questionAnswers = questionAnswers.filter(
        (a) => a.attemptId !== args.excludeAttemptId
      );
    }

    // Sort by submission time (oldest first for timeline view)
    questionAnswers.sort(
      (a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0)
    );

    // Get attempt context for each
    const attemptsWithContext = await Promise.all(
      questionAnswers.map(async (answer) => {
        const attempt = await ctx.db.get(answer.attemptId);
        return {
          attemptId: answer.attemptId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
          submittedAt: answer.submittedAt,
          timeSpentMs: answer.timeSpentMs,
          mode: attempt?.mode,
        };
      })
    );

    // Calculate improvement status
    const hasWrongAttempt = attemptsWithContext.some((a) => !a.isCorrect);
    const hasCorrectAttempt = attemptsWithContext.some((a) => a.isCorrect);
    const improved = hasWrongAttempt && hasCorrectAttempt;

    return {
      attempts: attemptsWithContext,
      totalAttempts: attemptsWithContext.length,
      improved,
      hasWrongAttempt,
      hasCorrectAttempt,
    };
  },
});

// ─────────────────────────────────────────────────────────
// GET EXPLANATION FOR A QUESTION
// ─────────────────────────────────────────────────────────

/**
 * Get explanation for a specific question.
 * Used to show explanations in feedback screens.
 */
export const getQuestionExplanation = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const explanation = await ctx.db
      .query("explanations")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();

    if (!explanation) {
      return null;
    }

    return {
      correctExplanation: explanation.correctExplanation,
      wrongAnswerExplanations: explanation.wrongAnswerExplanations,
      commonMistakes: explanation.commonMistakes,
    };
  },
});

// ─────────────────────────────────────────────────────────
// WRONG ANSWERS COUNT
// ─────────────────────────────────────────────────────────

/**
 * Get count of wrong answers for dashboard display.
 */
export const getWrongAnswersCount = query({
  args: {
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all wrong answers for this user
    const allAnswers = await ctx.db
      .query("userAnswers")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    // Filter to wrong, graded answers
    const wrongAnswers = allAnswers.filter(
      (a) => a.isCorrect === false && a.status === "graded"
    );

    // Get unique questions
    const uniqueQuestions = new Set(wrongAnswers.map((a) => a.questionId));

    // Check how many have been improved
    let improvedCount = 0;
    for (const questionId of uniqueQuestions) {
      const correctAttempt = allAnswers.find(
        (a) => a.questionId === questionId && a.isCorrect === true
      );
      if (correctAttempt) {
        improvedCount++;
      }
    }

    return {
      totalWrongQuestions: uniqueQuestions.size,
      improvedCount,
      needsReviewCount: uniqueQuestions.size - improvedCount,
    };
  },
});
