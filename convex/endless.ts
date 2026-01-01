import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────

const MASTERY_LEVELS = {
  novice: { min: 0, max: 99 },
  beginner: { min: 100, max: 299 },
  intermediate: { min: 300, max: 599 },
  advanced: { min: 600, max: 899 },
  expert: { min: 900, max: 1000 },
} as const;

type MasteryLevel = keyof typeof MASTERY_LEVELS;

function getMasteryLevel(points: number): MasteryLevel {
  if (points >= 900) return "expert";
  if (points >= 600) return "advanced";
  if (points >= 300) return "intermediate";
  if (points >= 100) return "beginner";
  return "novice";
}

// ─────────────────────────────────────────────────────────
// SM-2 SPACED REPETITION HELPERS
// ─────────────────────────────────────────────────────────

interface SM2Update {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewedAt: number;
}

function calculateSM2Update(
  correct: boolean,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
): SM2Update {
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  if (correct) {
    const newRepetitions = currentRepetitions + 1;
    let newInterval: number;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor);
    }

    // Ease factor increases slightly for correct answers
    const newEaseFactor = Math.max(1.3, currentEaseFactor + 0.1);

    return {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      nextReviewAt: now + newInterval * MS_PER_DAY,
      lastReviewedAt: now,
    };
  } else {
    // Incorrect answer - reset
    return {
      easeFactor: Math.max(1.3, currentEaseFactor - 0.2),
      interval: 1,
      repetitions: 0,
      nextReviewAt: now + MS_PER_DAY, // Review tomorrow
      lastReviewedAt: now,
    };
  }
}

// ─────────────────────────────────────────────────────────
// MASTERY CALCULATION HELPERS
// ─────────────────────────────────────────────────────────

function calculateMasteryPointChange(
  correct: boolean,
  questionDifficulty: number,
  currentStreak: number,
  currentMasteryPoints: number
): number {
  const basePoints = correct ? 15 : -10;

  // Difficulty multiplier (1-3 difficulty -> 0.8-1.4 multiplier)
  const difficultyMultiplier = 0.6 + questionDifficulty * 0.2;

  // Streak bonus (only for correct)
  const streakBonus = correct ? Math.min(10, currentStreak * 2) : 0;

  // Diminishing returns at higher levels (correct only)
  const levelPenalty = correct
    ? Math.max(0.5, 1 - currentMasteryPoints / 2000)
    : 1;

  const pointChange = Math.round(
    (basePoints * difficultyMultiplier + streakBonus) * levelPenalty
  );

  // Clamp to 0-1000
  const newPoints = Math.max(
    0,
    Math.min(1000, currentMasteryPoints + pointChange)
  );
  return newPoints - currentMasteryPoints;
}

// ─────────────────────────────────────────────────────────
// QUESTION SELECTION ALGORITHM
// ─────────────────────────────────────────────────────────

async function selectNextQuestion(
  ctx: MutationCtx,
  visitorId: string,
  answeredQuestionIds: Id<"questions">[],
  category?: "reading_writing" | "math",
  domain?: string
): Promise<Id<"questions"> | null> {
  // Step 1: Get all questions
  let allQuestions = await ctx.db.query("questions").collect();

  // Filter by category if specified
  if (category) {
    allQuestions = allQuestions.filter((q) => q.category === category);
  }

  // Filter by domain if specified (e.g., "geometry_and_trigonometry")
  if (domain) {
    allQuestions = allQuestions.filter((q) => q.domain === domain);
  }

  if (allQuestions.length === 0) {
    return null;
  }

  // Filter out already answered questions in this session
  let eligibleQuestions = allQuestions.filter(
    (q) => !answeredQuestionIds.includes(q._id)
  );

  // If all questions exhausted, reset pool (allow repeats)
  if (eligibleQuestions.length === 0) {
    eligibleQuestions = allQuestions;
  }

  // Step 2: Score each question
  const scoredQuestions = await Promise.all(
    eligibleQuestions.map(async (question) => {
      let score = 0;

      // 2a. Spaced Repetition Score (0-40 points)
      const reviewSchedule = await ctx.db
        .query("questionReviewSchedule")
        .withIndex("by_visitor_and_question", (q) =>
          q.eq("visitorId", visitorId).eq("questionId", question._id)
        )
        .first();

      if (reviewSchedule) {
        const now = Date.now();
        const daysSinceReview =
          (now - reviewSchedule.lastReviewedAt) / (24 * 60 * 60 * 1000);
        const daysOverdue = daysSinceReview - reviewSchedule.interval;

        if (daysOverdue > 0) {
          // Overdue for review - high priority
          score += Math.min(40, 20 + daysOverdue * 5);
        } else if (daysOverdue > -1) {
          // Due soon
          score += 15;
        }
        // Questions not due yet get 0 SR score
      } else {
        // Never seen - moderate priority for new questions
        score += 25;
      }

      // 2b. Adaptive Difficulty Score (0-40 points)
      const skillMastery = await ctx.db
        .query("skillMastery")
        .withIndex("by_visitor_and_skill", (q) =>
          q.eq("visitorId", visitorId).eq("skill", question.skill)
        )
        .first();

      if (skillMastery && skillMastery.totalQuestions > 0) {
        const accuracy =
          skillMastery.correctAnswers / skillMastery.totalQuestions;
        // Prioritize weak skills (low accuracy = high score)
        score += Math.round((1 - accuracy) * 40);
      } else {
        // Untested skill - high priority
        score += 35;
      }

      // 2c. Recency Penalty (0-20 points penalty)
      if (skillMastery && skillMastery.lastPracticedAt) {
        const minutesSincePractice =
          (Date.now() - skillMastery.lastPracticedAt) / 60000;
        if (minutesSincePractice < 5) {
          score -= 20;
        } else if (minutesSincePractice < 15) {
          score -= 10;
        }
      }

      // 2d. Randomization factor (0-10 points)
      score += Math.random() * 10;

      return { question, score };
    })
  );

  // Step 3: Sort by score and select top question
  scoredQuestions.sort((a, b) => b.score - a.score);

  return scoredQuestions[0].question._id;
}

// ─────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────

// Start an endless mode session
export const startEndlessSession = mutation({
  args: {
    visitorId: v.string(),
    category: v.optional(
      v.union(v.literal("reading_writing"), v.literal("math"))
    ),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing in-progress endless session
    const existingAttempt = await ctx.db
      .query("examAttempts")
      .withIndex("by_visitor_and_status", (q) =>
        q.eq("visitorId", args.visitorId).eq("status", "in_progress")
      )
      .filter((q) => q.eq(q.field("mode"), "endless"))
      .first();

    if (existingAttempt) {
      // Return existing session
      const existingSession = await ctx.db
        .query("endlessSession")
        .withIndex("by_attempt", (q) => q.eq("attemptId", existingAttempt._id))
        .first();

      if (existingSession) {
        return {
          attemptId: existingAttempt._id,
          sessionId: existingSession._id,
          currentQuestionId: existingSession.currentQuestionId,
          isResumed: true,
        };
      }
    }

    // Create new exam attempt
    const attemptId = await ctx.db.insert("examAttempts", {
      visitorId: args.visitorId,
      mode: "endless",
      section: args.category,
      currentSectionIndex: 0,
      currentQuestionIndex: 0,
      status: "in_progress",
      startedAt: now,
      lastActiveAt: now,
    });

    // Get user's best streak
    const previousSessions = await ctx.db
      .query("endlessSession")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    const bestStreak = previousSessions.reduce(
      (max, s) => Math.max(max, s.bestStreak),
      0
    );

    // Select first question
    const firstQuestionId = await selectNextQuestion(
      ctx,
      args.visitorId,
      [],
      args.category,
      args.domain
    );

    // Create endless session
    const sessionId = await ctx.db.insert("endlessSession", {
      attemptId,
      visitorId: args.visitorId,
      category: args.category,
      domain: args.domain,
      currentStreak: 0,
      bestStreak,
      sessionStreak: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      questionIdsAnswered: [],
      currentQuestionId: firstQuestionId ?? undefined,
      startedAt: now,
      lastActiveAt: now,
    });

    return {
      attemptId,
      sessionId,
      currentQuestionId: firstQuestionId,
      isResumed: false,
    };
  },
});

// Submit answer in endless mode
export const submitEndlessAnswer = mutation({
  args: {
    attemptId: v.id("examAttempts"),
    questionId: v.id("questions"),
    selectedAnswer: v.string(),
    timeSpentMs: v.number(),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the question to check answer
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const isCorrect = args.selectedAnswer === question.correctAnswer;

    // Get the endless session
    const session = await ctx.db
      .query("endlessSession")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .first();

    if (!session) {
      throw new Error("Endless session not found");
    }

    // 1. Save the user answer
    await ctx.db.insert("userAnswers", {
      attemptId: args.attemptId,
      questionId: args.questionId,
      visitorId: args.visitorId,
      selectedAnswer: args.selectedAnswer,
      status: "graded",
      isCorrect,
      flagged: false,
      firstViewedAt: now - args.timeSpentMs,
      lastModifiedAt: now,
      submittedAt: now,
      timeSpentMs: args.timeSpentMs,
    });

    // 2. Update streaks
    const newSessionStreak = isCorrect ? session.sessionStreak + 1 : 0;
    const newCurrentStreak = isCorrect ? session.currentStreak + 1 : 0;
    const newBestStreak = Math.max(session.bestStreak, newCurrentStreak);

    // 3. Update question review schedule (SM-2)
    const existingSchedule = await ctx.db
      .query("questionReviewSchedule")
      .withIndex("by_visitor_and_question", (q) =>
        q.eq("visitorId", args.visitorId).eq("questionId", args.questionId)
      )
      .first();

    const sm2Update = calculateSM2Update(
      isCorrect,
      existingSchedule?.easeFactor ?? 2.5,
      existingSchedule?.interval ?? 1,
      existingSchedule?.repetitions ?? 0
    );

    if (existingSchedule) {
      await ctx.db.patch(existingSchedule._id, {
        ...sm2Update,
        totalAttempts: existingSchedule.totalAttempts + 1,
        correctAttempts: existingSchedule.correctAttempts + (isCorrect ? 1 : 0),
      });
    } else {
      await ctx.db.insert("questionReviewSchedule", {
        visitorId: args.visitorId,
        questionId: args.questionId,
        ...sm2Update,
        totalAttempts: 1,
        correctAttempts: isCorrect ? 1 : 0,
      });
    }

    // 4. Update skill mastery
    const existingMastery = await ctx.db
      .query("skillMastery")
      .withIndex("by_visitor_and_skill", (q) =>
        q.eq("visitorId", args.visitorId).eq("skill", question.skill)
      )
      .first();

    const currentMasteryPoints = existingMastery?.masteryPoints ?? 0;
    const currentSkillStreak = existingMastery?.currentStreak ?? 0;

    const pointChange = calculateMasteryPointChange(
      isCorrect,
      question.difficulty,
      isCorrect ? currentSkillStreak : 0,
      currentMasteryPoints
    );

    const newMasteryPoints = currentMasteryPoints + pointChange;
    const newMasteryLevel = getMasteryLevel(newMasteryPoints);
    const newSkillStreak = isCorrect ? currentSkillStreak + 1 : 0;

    if (existingMastery) {
      await ctx.db.patch(existingMastery._id, {
        masteryPoints: newMasteryPoints,
        masteryLevel: newMasteryLevel,
        totalQuestions: existingMastery.totalQuestions + 1,
        correctAnswers: existingMastery.correctAnswers + (isCorrect ? 1 : 0),
        currentStreak: newSkillStreak,
        lastPracticedAt: now,
      });
    } else {
      await ctx.db.insert("skillMastery", {
        visitorId: args.visitorId,
        category: question.category,
        domain: question.domain,
        skill: question.skill,
        masteryLevel: newMasteryLevel,
        masteryPoints: newMasteryPoints,
        totalQuestions: 1,
        correctAnswers: isCorrect ? 1 : 0,
        currentStreak: newSkillStreak,
        lastPracticedAt: now,
      });
    }

    // 5. Update daily goals
    const today = new Date().toISOString().split("T")[0];

    const dailyGoal = await ctx.db
      .query("dailyGoals")
      .withIndex("by_visitor_and_date", (q) =>
        q.eq("visitorId", args.visitorId).eq("date", today)
      )
      .first();

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    const dailyTarget = preferences?.dailyQuestionTarget ?? 10;

    if (dailyGoal) {
      const newQuestionsAnswered = dailyGoal.questionsAnswered + 1;
      await ctx.db.patch(dailyGoal._id, {
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: dailyGoal.correctAnswers + (isCorrect ? 1 : 0),
        timeSpentMs: dailyGoal.timeSpentMs + args.timeSpentMs,
        dailyGoalMet: newQuestionsAnswered >= dailyTarget,
      });
    } else {
      await ctx.db.insert("dailyGoals", {
        visitorId: args.visitorId,
        date: today,
        targetQuestions: dailyTarget,
        questionsAnswered: 1,
        correctAnswers: isCorrect ? 1 : 0,
        timeSpentMs: args.timeSpentMs,
        dailyGoalMet: 1 >= dailyTarget,
      });
    }

    // 6. Select next question
    const answeredIds = [...session.questionIdsAnswered, args.questionId];
    const nextQuestionId = await selectNextQuestion(
      ctx,
      args.visitorId,
      answeredIds,
      session.category,
      session.domain
    );

    // 7. Update endless session
    await ctx.db.patch(session._id, {
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
      sessionStreak: newSessionStreak,
      questionsAnswered: session.questionsAnswered + 1,
      correctAnswers: session.correctAnswers + (isCorrect ? 1 : 0),
      questionIdsAnswered: answeredIds,
      currentQuestionId: nextQuestionId ?? undefined,
      lastActiveAt: now,
    });

    // Update attempt lastActiveAt
    await ctx.db.patch(args.attemptId, {
      lastActiveAt: now,
    });

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      nextQuestionId,
      currentStreak: newCurrentStreak,
      sessionStreak: newSessionStreak,
      bestStreak: newBestStreak,
      masteryLevel: newMasteryLevel,
      masteryPoints: newMasteryPoints,
      pointChange,
    };
  },
});

// End endless session
export const endEndlessSession = mutation({
  args: {
    attemptId: v.id("examAttempts"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Mark attempt as completed
    await ctx.db.patch(args.attemptId, {
      status: "completed",
      completedAt: now,
      lastActiveAt: now,
    });

    // Get session for summary
    const session = await ctx.db
      .query("endlessSession")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .first();

    if (!session) {
      return null;
    }

    return {
      questionsAnswered: session.questionsAnswered,
      correctAnswers: session.correctAnswers,
      accuracy:
        session.questionsAnswered > 0
          ? Math.round(
              (session.correctAnswers / session.questionsAnswered) * 100
            )
          : 0,
      sessionStreak: session.sessionStreak,
      bestStreak: session.bestStreak,
    };
  },
});

// Set daily goal target
export const setDailyGoalTarget = mutation({
  args: {
    visitorId: v.string(),
    target: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    const clampedTarget = Math.max(1, Math.min(100, args.target));

    if (existing) {
      await ctx.db.patch(existing._id, {
        dailyQuestionTarget: clampedTarget,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        visitorId: args.visitorId,
        dailyQuestionTarget: clampedTarget,
      });
    }
  },
});

// ─────────────────────────────────────────────────────────
// QUERIES (Real-time via WebSocket)
// ─────────────────────────────────────────────────────────

// Get current endless session state
export const getEndlessSessionState = query({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("endlessSession")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .first();

    if (!session) return null;

    return {
      currentStreak: session.currentStreak,
      bestStreak: session.bestStreak,
      sessionStreak: session.sessionStreak,
      questionsAnswered: session.questionsAnswered,
      correctAnswers: session.correctAnswers,
      accuracy:
        session.questionsAnswered > 0
          ? Math.round(
              (session.correctAnswers / session.questionsAnswered) * 100
            )
          : 0,
      currentQuestionId: session.currentQuestionId,
    };
  },
});

// Get current question with full data
export const getCurrentEndlessQuestion = query({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("endlessSession")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .first();

    if (!session || !session.currentQuestionId) return null;

    const question = await ctx.db.get(session.currentQuestionId);
    if (!question) return null;

    // Get answer options
    const options = await ctx.db
      .query("answerOptions")
      .withIndex("by_question", (q) => q.eq("questionId", question._id))
      .collect();

    // Get passage if applicable
    let passage = null;
    if (question.passageId) {
      passage = await ctx.db.get(question.passageId);
    }

    // Get skill mastery for this question's skill
    const mastery = await ctx.db
      .query("skillMastery")
      .withIndex("by_visitor_and_skill", (q) =>
        q.eq("visitorId", session.visitorId).eq("skill", question.skill)
      )
      .first();

    return {
      question: {
        ...question,
        options: options.sort((a, b) => a.order - b.order),
      },
      passage,
      mastery: mastery
        ? {
            level: mastery.masteryLevel,
            points: mastery.masteryPoints,
            skill: mastery.skill,
            domain: mastery.domain,
          }
        : null,
    };
  },
});

// Get skill mastery overview
export const getSkillMasteryOverview = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const masteries = await ctx.db
      .query("skillMastery")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    // Group by category and domain
    const byCategory = {
      reading_writing: [] as typeof masteries,
      math: [] as typeof masteries,
    };

    for (const m of masteries) {
      byCategory[m.category].push(m);
    }

    return byCategory;
  },
});

// Get daily goal progress
export const getDailyGoalProgress = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const dailyGoal = await ctx.db
      .query("dailyGoals")
      .withIndex("by_visitor_and_date", (q) =>
        q.eq("visitorId", args.visitorId).eq("date", today)
      )
      .first();

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    const target = preferences?.dailyQuestionTarget ?? 10;

    if (!dailyGoal) {
      return {
        questionsAnswered: 0,
        target,
        progress: 0,
        goalMet: false,
        correctAnswers: 0,
        accuracy: 0,
      };
    }

    return {
      questionsAnswered: dailyGoal.questionsAnswered,
      target: dailyGoal.targetQuestions,
      progress: Math.min(
        100,
        Math.round((dailyGoal.questionsAnswered / dailyGoal.targetQuestions) * 100)
      ),
      goalMet: dailyGoal.dailyGoalMet,
      correctAnswers: dailyGoal.correctAnswers,
      accuracy:
        dailyGoal.questionsAnswered > 0
          ? Math.round(
              (dailyGoal.correctAnswers / dailyGoal.questionsAnswered) * 100
            )
          : 0,
    };
  },
});

// Get streak stats for user
export const getStreakStats = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    // Get all endless sessions for this user
    const sessions = await ctx.db
      .query("endlessSession")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    // Find the current in-progress session
    const currentSession = sessions.find(
      async (s) => {
        const attempt = await ctx.db.get(s.attemptId);
        return attempt?.status === "in_progress";
      }
    );

    // Calculate overall best streak
    const overallBestStreak = sessions.reduce(
      (max, s) => Math.max(max, s.bestStreak),
      0
    );

    // Get current streak from active session, or 0
    let currentStreak = 0;
    for (const session of sessions) {
      const attempt = await ctx.db.get(session.attemptId);
      if (attempt?.status === "in_progress") {
        currentStreak = session.currentStreak;
        break;
      }
    }

    return {
      currentStreak,
      bestStreak: overallBestStreak,
      totalSessions: sessions.length,
    };
  },
});

// Get current endless attempt for resume
export const getCurrentEndlessAttempt = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("examAttempts")
      .withIndex("by_visitor_and_status", (q) =>
        q.eq("visitorId", args.visitorId).eq("status", "in_progress")
      )
      .filter((q) => q.eq(q.field("mode"), "endless"))
      .first();

    if (!attempt) return null;

    const session = await ctx.db
      .query("endlessSession")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
      .first();

    return { attempt, session };
  },
});
